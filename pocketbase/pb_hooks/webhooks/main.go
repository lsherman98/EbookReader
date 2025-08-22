package webhooks

import (
	"encoding/json"
	"io"
	"net/http"
	"os"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/stripe/stripe-go/v82"
	portal "github.com/stripe/stripe-go/v82/billingportal/session"
	checkout "github.com/stripe/stripe-go/v82/checkout/session"
	"github.com/stripe/stripe-go/v82/customer"
	"github.com/stripe/stripe-go/v82/webhook"
)

func Init(app *pocketbase.PocketBase) error {
	stripe.Key = os.Getenv("STRIPE_API_KEY")
	domain := "http://localhost:5173"

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		subscriptionsCollection, err := app.FindCollectionByNameOrId("stripe_subscriptions")
		if err != nil {
			return err
		}

		chargesCollection, err := app.FindCollectionByNameOrId("stripe_charges")
		if err != nil {
			return err
		}

		customersCollection, err := app.FindCollectionByNameOrId("stripe_customers")
		if err != nil {
			return err
		}

		se.Router.POST("/webhooks/stripe", func(e *core.RequestEvent) error {
			payload, err := io.ReadAll(e.Request.Body)
			if err != nil {
				return e.BadRequestError("failed to read request body", err)
			}

			event := stripe.Event{}
			if err := e.BindBody(&event); err != nil {
				return e.BadRequestError("failed to read stripe event", err)
			}

			webhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
			signatureHeader := e.Request.Header.Get("Stripe-Signature")
			event, err = webhook.ConstructEvent(payload, signatureHeader, webhookSecret)
			if err != nil {
				return e.BadRequestError("failed to verify stripe event", err)
			}

			switch event.Type {
			case "customer.subscription.created":
				var subscription stripe.Subscription
				if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
					return e.BadRequestError("failed to unmarshal customer.subscription.created event", err)
				}
				if err := updateSubscriptionRecord(e, subscription, subscriptionsCollection, customersCollection); err != nil {
					return e.BadRequestError("failed to update subscription record", err)
				}
			case "customer.subscription.updated":
				var subscription stripe.Subscription
				if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
					return e.BadRequestError("failed to unmarshal customer.subscription.updated event", err)
				}
				if err := updateSubscriptionRecord(e, subscription, subscriptionsCollection, customersCollection); err != nil {
					return e.BadRequestError("failed to update subscription record", err)
				}
			case "customer.subscription.deleted":
				var subscription stripe.Subscription
				if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
					return e.BadRequestError("failed to unmarshal customer.subscription.deleted event", err)
				}
				if err := updateSubscriptionRecord(e, subscription, subscriptionsCollection, customersCollection); err != nil {
					return e.BadRequestError("failed to update subscription record", err)
				}
			case "charge.succeeded":
				var charge stripe.Charge
				if err := json.Unmarshal(event.Data.Raw, &charge); err != nil {
					return e.BadRequestError("failed to unmarshal charge.succeeded event", err)
				}
				if err := handleChargeSucceeded(e, charge, chargesCollection, customersCollection); err != nil {
					return e.BadRequestError("failed to handle charge.succeeded", err)
				}
			default:
				return e.BadRequestError("unexpected stripe event type", nil)
			}

			e.Response.WriteHeader(http.StatusOK)
			return nil
		})

		se.Router.GET("/stripe/create-checkout-session", func(e *core.RequestEvent) error {
			user := e.Auth.Id
			email := e.Auth.Email()
			subscriptionType := e.Request.URL.Query().Get("subscriptionType")

			customerRecord, err := e.App.FindFirstRecordByData(customersCollection.Name, "user", user)
			if err != nil && customerRecord == nil {
				params := &stripe.CustomerParams{
					Email: stripe.String(email),
					Metadata: map[string]string{
						"pb_user": user,
					},
				}

				result, err := customer.New(params)
				if err != nil {
					return e.BadRequestError("failed to create customer", err)
				}

				customerRecord = core.NewRecord(customersCollection)
				customerRecord.Set("user", user)
				customerRecord.Set("customer_id", result.ID)
				customerRecord.Set("email", email)
				if err := app.Save(customerRecord); err != nil {
					return e.BadRequestError("failed to save customer record", err)
				}
			}

			var priceId string
			yearlyPriceId := "price_1RyoWUCWP3HHujSqL2z838gl"
			monthlyPriceId := "price_1RyoWUCWP3HHujSqqXATuEQQ"

			switch subscriptionType {
			case "yearly":
				priceId = yearlyPriceId
			case "monthly":
				priceId = monthlyPriceId
			default:
				return e.BadRequestError("invalid product param", nil)
			}

			params := &stripe.CheckoutSessionParams{
				LineItems: []*stripe.CheckoutSessionLineItemParams{
					{
						Price:    stripe.String(priceId),
						Quantity: stripe.Int64(1),
					},
				},
				Mode:       stripe.String(string(stripe.CheckoutSessionModeSubscription)),
				SuccessURL: stripe.String(domain + "/library"),
				CancelURL:  stripe.String(domain + "/subscription"),
				Customer:   stripe.String(customerRecord.GetString("customer_id")),
			}

			s, err := checkout.New(params)
			if err != nil {
				e.App.Logger().Error("New checkout session", "error", err)
				return e.BadRequestError("failed to create checkout session", err)
			}

			e.JSON(http.StatusOK, map[string]string{"url": s.URL})
			return nil
		}).Bind(apis.RequireAuth())

		se.Router.GET("/stripe/create-portal-session", func(e *core.RequestEvent) error {
			userId := e.Auth.Id
			customer, err := e.App.FindFirstRecordByData(customersCollection.Name, "user", userId)
			if err != nil {
				return e.BadRequestError("failed to find customer", err)
			}

			params := &stripe.BillingPortalSessionParams{
				Customer:  stripe.String(customer.GetString("customer_id")),
				ReturnURL: stripe.String(domain + "/subscription"),
			}

			s, err := portal.New(params)
			if err != nil {
				e.App.Logger().Error("New billing portal session", "error", err)
				return e.BadRequestError("failed to create portal session", err)
			}

			e.JSON(http.StatusOK, map[string]string{"url": s.URL})
			return nil
		}).Bind(apis.RequireAuth())

		return se.Next()
	})

	return nil
}

func updateSubscriptionRecord(e *core.RequestEvent, subscription stripe.Subscription, subscriptionsCollection, customersCollection *core.Collection) error {
	var subscriptionRecord *core.Record
	subscriptionRecord, err := e.App.FindFirstRecordByData(subscriptionsCollection.Name, "subscription_id", subscription.ID)
	if err != nil {
		subscriptionRecord = core.NewRecord(subscriptionsCollection)
	}

	customer, err := e.App.FindFirstRecordByData(customersCollection.Name, "customer_id", subscription.Customer.ID)
	if err != nil {
		return err
	}

	user, err := e.App.FindRecordById("users", customer.GetString("user"))
	if err != nil {
		return err
	}

	user.Set("paid", subscription.Status == stripe.SubscriptionStatusActive)

	subscriptionRecord.Set("subscription_id", subscription.ID)
	subscriptionRecord.Set("user", customer.GetString("user"))
	subscriptionRecord.Set("customer_id", subscription.Customer.ID)
	subscriptionRecord.Set("price_id", subscription.Items.Data[0].Price.ID)
	subscriptionRecord.Set("metadata", subscription.Metadata)
	subscriptionRecord.Set("status", subscription.Status)
	subscriptionRecord.Set("cancel_at_period_end", subscription.CancelAtPeriodEnd)
	subscriptionRecord.Set("cancel_at", subscription.CancelAt)
	subscriptionRecord.Set("canceled_at", subscription.CanceledAt)
	subscriptionRecord.Set("current_period_start", subscription.Items.Data[0].CurrentPeriodStart)
	subscriptionRecord.Set("current_period_end", subscription.Items.Data[0].CurrentPeriodEnd)
	subscriptionRecord.Set("created", subscription.Created)
	subscriptionRecord.Set("ended_at", subscription.EndedAt)

	if err := e.App.Save(user); err != nil {
		return err
	}
	if err := e.App.Save(subscriptionRecord); err != nil {
		return err
	}

	return nil
}

func handleChargeSucceeded(e *core.RequestEvent, charge stripe.Charge, chargesCollection, customersCollection *core.Collection) error {
	user, err := e.App.FindFirstRecordByData(customersCollection.Name, "customer_id", charge.Customer.ID)
	if err != nil {
		return e.BadRequestError("failed to find customer", err)
	}

	chargeRecord := core.NewRecord(chargesCollection)
	chargeRecord.Set("charge_id", charge.ID)
	chargeRecord.Set("amount", charge.Amount)
	chargeRecord.Set("status", charge.Status)
	chargeRecord.Set("created", charge.Created)
	chargeRecord.Set("user", user.GetString("user"))
	chargeRecord.Set("customer_id", charge.Customer.ID)
	chargeRecord.Set("receipt_url", charge.ReceiptURL)
	chargeRecord.Set("metadata", charge.Metadata)
	chargeRecord.Set("paid", charge.Paid)
	chargeRecord.Set("refunded", charge.Refunded)

	if err := e.App.Save(chargeRecord); err != nil {
		return err
	}
	return nil
}
