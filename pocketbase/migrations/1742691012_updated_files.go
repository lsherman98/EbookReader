package migrations

import (
	"encoding/json"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_3446931122")
		if err != nil {
			return err
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"createRule": "@request.auth.id = user.id",
			"deleteRule": "@request.auth.id = user.id",
			"listRule": "@request.auth.id = user.id",
			"updateRule": "@request.auth.id = user.id",
			"viewRule": "@request.auth.id = user.id"
		}`), &collection); err != nil {
			return err
		}

		// update field
		if err := collection.Fields.AddMarshaledJSONAt(1, []byte(`{
			"autogeneratePattern": "",
			"hidden": false,
			"id": "text1579384326",
			"max": 0,
			"min": 0,
			"name": "title",
			"pattern": "",
			"presentable": false,
			"primaryKey": false,
			"required": true,
			"system": false,
			"type": "text"
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_3446931122")
		if err != nil {
			return err
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"createRule": "",
			"deleteRule": "",
			"listRule": "",
			"updateRule": "",
			"viewRule": ""
		}`), &collection); err != nil {
			return err
		}

		// update field
		if err := collection.Fields.AddMarshaledJSONAt(1, []byte(`{
			"autogeneratePattern": "",
			"hidden": false,
			"id": "text1579384326",
			"max": 0,
			"min": 0,
			"name": "name",
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
	})
}
