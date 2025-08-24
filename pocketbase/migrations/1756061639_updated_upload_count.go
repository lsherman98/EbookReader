package migrations

import (
	"encoding/json"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_1286117294")
		if err != nil {
			return err
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"name": "uploads_by_user"
		}`), &collection); err != nil {
			return err
		}

		// remove field
		collection.Fields.RemoveById("_clone_8Fho")

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(1, []byte(`{
			"exceptDomains": null,
			"hidden": false,
			"id": "_clone_e1pn",
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
		collection, err := app.FindCollectionByNameOrId("pbc_1286117294")
		if err != nil {
			return err
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"name": "upload_count"
		}`), &collection); err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(1, []byte(`{
			"exceptDomains": null,
			"hidden": false,
			"id": "_clone_8Fho",
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
		collection.Fields.RemoveById("_clone_e1pn")

		return app.Save(collection)
	})
}
