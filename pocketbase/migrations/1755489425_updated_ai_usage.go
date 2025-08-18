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

		// remove field
		collection.Fields.RemoveById("number1531654091")

		// remove field
		collection.Fields.RemoveById("number337001766")

		// remove field
		collection.Fields.RemoveById("number1715341057")

		// update field
		if err := collection.Fields.AddMarshaledJSONAt(7, []byte(`{
			"cascadeDelete": false,
			"collectionId": "pbc_2170393721",
			"hidden": false,
			"id": "relation3420824369",
			"maxSelect": 1,
			"minSelect": 0,
			"name": "book",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "relation"
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_3423747372")
		if err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(8, []byte(`{
			"hidden": false,
			"id": "number1531654091",
			"max": null,
			"min": null,
			"name": "input_cost",
			"onlyInt": false,
			"presentable": false,
			"required": false,
			"system": false,
			"type": "number"
		}`)); err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(9, []byte(`{
			"hidden": false,
			"id": "number337001766",
			"max": null,
			"min": null,
			"name": "output_cost",
			"onlyInt": false,
			"presentable": false,
			"required": false,
			"system": false,
			"type": "number"
		}`)); err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(10, []byte(`{
			"hidden": false,
			"id": "number1715341057",
			"max": null,
			"min": null,
			"name": "total_cost",
			"onlyInt": false,
			"presentable": false,
			"required": false,
			"system": false,
			"type": "number"
		}`)); err != nil {
			return err
		}

		// update field
		if err := collection.Fields.AddMarshaledJSONAt(7, []byte(`{
			"cascadeDelete": true,
			"collectionId": "pbc_2170393721",
			"hidden": false,
			"id": "relation3420824369",
			"maxSelect": 1,
			"minSelect": 0,
			"name": "book",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "relation"
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	})
}
