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
			"viewQuery": "SELECT\n  u.id,\n  u.email,\n  printf('$%.2f', SUM(au.total_cost)) AS total_spend\nFROM\n  ai_usage AS au\nLEFT JOIN\n  users AS u ON au.user = u.id\nGROUP BY\n  au.user, u.email\nORDER BY\n  total_spend DESC;"
		}`), &collection); err != nil {
			return err
		}

		// remove field
		collection.Fields.RemoveById("_clone_hbA9")

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(1, []byte(`{
			"exceptDomains": null,
			"hidden": false,
			"id": "_clone_jWEY",
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
			"viewQuery": "SELECT\n  u.id,\n  u.email,\n  SUM(au.total_cost) AS total_spend\nFROM\n  ai_usage AS au\nLEFT JOIN\n  users AS u ON au.user = u.id\nGROUP BY\n  au.user, u.email\nORDER BY\n  total_spend DESC;"
		}`), &collection); err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(1, []byte(`{
			"exceptDomains": null,
			"hidden": false,
			"id": "_clone_hbA9",
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
		collection.Fields.RemoveById("_clone_jWEY")

		return app.Save(collection)
	})
}
