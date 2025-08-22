package migrations

import (
	"encoding/json"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_3174063690")
		if err != nil {
			return err
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"indexes": [
				"CREATE INDEX ` + "`" + `idx_SVjRyNU0v4` + "`" + ` ON ` + "`" + `charges` + "`" + ` (` + "`" + `user` + "`" + `)"
			],
			"name": "charges"
		}`), &collection); err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(5, []byte(`{
			"autogeneratePattern": "",
			"hidden": false,
			"id": "text3591686119",
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
		if err := collection.Fields.AddMarshaledJSONAt(6, []byte(`{
			"autogeneratePattern": "",
			"hidden": false,
			"id": "text1428703508",
			"max": 0,
			"min": 0,
			"name": "charge_id",
			"pattern": "",
			"presentable": false,
			"primaryKey": false,
			"required": false,
			"system": false,
			"type": "text"
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_3174063690")
		if err != nil {
			return err
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"indexes": [
				"CREATE INDEX ` + "`" + `idx_SVjRyNU0v4` + "`" + ` ON ` + "`" + `transactions` + "`" + ` (` + "`" + `user` + "`" + `)"
			],
			"name": "transactions"
		}`), &collection); err != nil {
			return err
		}

		// remove field
		collection.Fields.RemoveById("text3591686119")

		// remove field
		collection.Fields.RemoveById("text1428703508")

		return app.Save(collection)
	})
}
