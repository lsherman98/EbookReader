package migrations

import (
	"encoding/json"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("qfiqyxbv63dsbsr")
		if err != nil {
			return err
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"indexes": [
				"CREATE INDEX ` + "`" + `idx_lnL7G0jjvJ` + "`" + ` ON ` + "`" + `subscription` + "`" + ` (` + "`" + `subscription_id` + "`" + `)"
			],
			"name": "subscription"
		}`), &collection); err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(4, []byte(`{
			"autogeneratePattern": "",
			"hidden": false,
			"id": "bjrj1xfv",
			"max": 0,
			"min": 0,
			"name": "price_id",
			"pattern": "",
			"presentable": false,
			"primaryKey": false,
			"required": false,
			"system": false,
			"type": "text"
		}`)); err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(12, []byte(`{
			"hidden": false,
			"id": "e73ay89h",
			"max": "",
			"min": "",
			"name": "trial_start",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "date"
		}`)); err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(13, []byte(`{
			"hidden": false,
			"id": "rfn4gfc7",
			"max": "",
			"min": "",
			"name": "trial_end",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "date"
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("qfiqyxbv63dsbsr")
		if err != nil {
			return err
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"indexes": [],
			"name": "subscriptions"
		}`), &collection); err != nil {
			return err
		}

		// remove field
		collection.Fields.RemoveById("bjrj1xfv")

		// remove field
		collection.Fields.RemoveById("e73ay89h")

		// remove field
		collection.Fields.RemoveById("rfn4gfc7")

		return app.Save(collection)
	})
}
