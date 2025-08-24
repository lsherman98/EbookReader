package migrations

import (
	"encoding/json"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_1989023549")
		if err != nil {
			return err
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"name": "ai_spend_by_user"
		}`), &collection); err != nil {
			return err
		}

		// remove field
		collection.Fields.RemoveById("_clone_tIe5")

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(1, []byte(`{
			"exceptDomains": null,
			"hidden": false,
			"id": "_clone_ZAdF",
			"name": "email",
			"onlyDomains": null,
			"presentable": false,
			"required": true,
			"system": true,
			"type": "email"
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_1989023549")
		if err != nil {
			return err
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"name": "spend_by_user"
		}`), &collection); err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(1, []byte(`{
			"exceptDomains": null,
			"hidden": false,
			"id": "_clone_tIe5",
			"name": "email",
			"onlyDomains": null,
			"presentable": false,
			"required": true,
			"system": true,
			"type": "email"
		}`)); err != nil {
			return err
		}

		// remove field
		collection.Fields.RemoveById("_clone_ZAdF")

		return app.Save(collection)
	})
}
