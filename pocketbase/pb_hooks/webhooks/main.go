package webhooks

import (
	"encoding/json"
	"io"
	"net/http"
	"os"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/webhook"
)

func Init(app *pocketbase.PocketBase) error {
	stripe.Key = os.Getenv("STRIPE_API_KEY")

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		subscriptionsCollection, err := app.FindCollectionByNameOrId("subscriptions")
		if err != nil {
			return err
		}

		chargesCollection, err := app.FindCollectionByNameOrId("charges")
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
				if err := updateSubscriptionRecord(e, subscriptionsCollection, subscription); err != nil {
					return e.BadRequestError("failed to update subscription record", err)
				}
			case "customer.subscription.updated":
				var subscription stripe.Subscription
				if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
					return e.BadRequestError("failed to unmarshal customer.subscription.updated event", err)
				}
				if err := updateSubscriptionRecord(e, subscriptionsCollection, subscription); err != nil {
					return e.BadRequestError("failed to update subscription record", err)
				}
			case "customer.subscription.deleted":
				var subscription stripe.Subscription
				if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
					return e.BadRequestError("failed to unmarshal customer.subscription.deleted event", err)
				}
				if err := updateSubscriptionRecord(e, subscriptionsCollection, subscription); err != nil {
					return e.BadRequestError("failed to update subscription record", err)
				}
			case "charge.succeeded":
				var charge stripe.Charge
				if err := json.Unmarshal(event.Data.Raw, &charge); err != nil {
					return e.BadRequestError("failed to unmarshal charge.succeeded event", err)
				}
				if err := handleChargeSucceeded(e, chargesCollection, charge); err != nil {
					return e.BadRequestError("failed to handle charge.succeeded", err)
				}
			default:
				return e.BadRequestError("unexpected stripe event type", nil)
			}

			e.Response.WriteHeader(http.StatusOK)
			return nil
		})

		se.Router.GET("/stripe/create-checkout-session", func(e *core.RequestEvent) error {

			return nil
		})

		se.Router.GET("/stripe/create-portal-session", func(e *core.RequestEvent) error {

			return nil
		})

		return se.Next()
	})

	return nil
}

func updateSubscriptionRecord(e *core.RequestEvent, subscriptionsCollection *core.Collection, subscription stripe.Subscription) error {
	var record *core.Record
	record, err := e.App.FindFirstRecordByData("subscriptions", "subscription_id", subscription.ID)
	if err != nil {
		record = core.NewRecord(subscriptionsCollection)
	}

	customerId := subscription.Customer.ID
	user, err := e.App.FindRecordById("users", customerId)
	if err != nil {
		return err
	}

	user.Set("paid", subscription.Status == stripe.SubscriptionStatusActive)

	record.Set("subscription_id", subscription.ID)
	record.Set("user", customerId)
	record.Set("metadata", subscription.Metadata)
	record.Set("status", subscription.Status)
	record.Set("cancel_at_period_end", subscription.CancelAtPeriodEnd)
	record.Set("cancel_at", subscription.CancelAt)
	record.Set("canceled_at", subscription.CanceledAt)
	record.Set("current_period_start", subscription.Items.Data[0].CurrentPeriodStart)
	record.Set("current_period_end", subscription.Items.Data[0].CurrentPeriodEnd)
	record.Set("created", subscription.Created)
	record.Set("ended_at", subscription.EndedAt)

	if err := e.App.Save(user); err != nil {
		return err
	}
	if err := e.App.Save(record); err != nil {
		return err
	}

	return nil
}

func handleChargeSucceeded(e *core.RequestEvent, chargesCollection *core.Collection, charge stripe.Charge) error {
	chargeRecord := core.NewRecord(chargesCollection)
	chargeRecord.Set("charge_id", charge.ID)
	chargeRecord.Set("amount", charge.Amount)
	chargeRecord.Set("status", charge.Status)
	chargeRecord.Set("created", charge.Created)
	chargeRecord.Set("user", charge.Customer.ID)
	chargeRecord.Set("receipt_url", charge.ReceiptURL)
	chargeRecord.Set("metadata", charge.Metadata)
	chargeRecord.Set("paid", charge.Paid)
	chargeRecord.Set("refunded", charge.Refunded)

	if err := e.App.Save(chargeRecord); err != nil {
		return err
	}
	return nil
}
