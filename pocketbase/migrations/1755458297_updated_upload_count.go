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
			"viewQuery": "SELECT users.id, users.email, COUNT(books.id) as uploadCount\nFROM users\nLEFT JOIN books ON users.id = books.user\nGROUP BY users.id\nORDER BY uploadCount DESC;"
		}`), &collection); err != nil {
			return err
		}

		// remove field
		collection.Fields.RemoveById("_clone_LJWB")

		// remove field
		collection.Fields.RemoveById("number2894334333")

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(1, []byte(`{
			"exceptDomains": null,
			"hidden": false,
			"id": "_clone_mQ1f",
			"name": "email",
			"onlyDomains": null,
			"presentable": false,
			"required": true,
			"system": true,
			"type": "email"
		}`)); err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(2, []byte(`{
			"hidden": false,
			"id": "number2646187012",
			"max": null,
			"min": null,
			"name": "uploadCount",
			"onlyInt": false,
			"presentable": false,
			"required": false,
			"system": false,
			"type": "number"
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
			"viewQuery": "SELECT users.id, users.email, COUNT(books.id) as upload_count\nFROM users\nLEFT JOIN books ON users.id = books.user\nGROUP BY users.id\nORDER BY upload_count DESC;"
		}`), &collection); err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(1, []byte(`{
			"exceptDomains": null,
			"hidden": false,
			"id": "_clone_LJWB",
			"name": "email",
			"onlyDomains": null,
			"presentable": false,
			"required": true,
			"system": true,
			"type": "email"
		}`)); err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(2, []byte(`{
			"hidden": false,
			"id": "number2894334333",
			"max": null,
			"min": null,
			"name": "upload_count",
			"onlyInt": false,
			"presentable": false,
			"required": false,
			"system": false,
			"type": "number"
		}`)); err != nil {
			return err
		}

		// remove field
		collection.Fields.RemoveById("_clone_mQ1f")

		// remove field
		collection.Fields.RemoveById("number2646187012")

		return app.Save(collection)
	})
}
