package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_3423747372")
		if err != nil {
			return err
		}

		// update field
		if err := collection.Fields.AddMarshaledJSONAt(2, []byte(`{
			"hidden": false,
			"id": "select2462348188",
			"maxSelect": 1,
			"name": "provider",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "select",
			"values": [
				"google",
				"openai"
			]
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_3423747372")
		if err != nil {
			return err
		}

		// update field
		if err := collection.Fields.AddMarshaledJSONAt(2, []byte(`{
			"hidden": false,
			"id": "select2462348188",
			"maxSelect": 1,
			"name": "provider",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "select",
			"values": [
				"openAI",
				"Google"
			]
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	})
}
