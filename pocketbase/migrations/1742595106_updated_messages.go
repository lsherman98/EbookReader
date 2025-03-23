package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_2605467279")
		if err != nil {
			return err
		}

		// remove field
		collection.Fields.RemoveById("text1920649840")

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(5, []byte(`{
			"hidden": false,
			"id": "bool2659951479",
			"name": "failed",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "bool"
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_2605467279")
		if err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(4, []byte(`{
			"autogeneratePattern": "",
			"hidden": false,
			"id": "text1920649840",
			"max": 0,
			"min": 0,
			"name": "parent_id",
			"pattern": "",
			"presentable": false,
			"primaryKey": false,
			"required": false,
			"system": false,
			"type": "text"
		}`)); err != nil {
			return err
		}

		// remove field
		collection.Fields.RemoveById("bool2659951479")

		return app.Save(collection)
	})
}
