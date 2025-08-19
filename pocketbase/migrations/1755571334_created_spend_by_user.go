package migrations

import (
	"encoding/json"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		jsonData := `{
			"createRule": null,
			"deleteRule": null,
			"fields": [
				{
					"autogeneratePattern": "",
					"hidden": false,
					"id": "text3208210256",
					"max": 0,
					"min": 0,
					"name": "id",
					"pattern": "^[a-z0-9]+$",
					"presentable": false,
					"primaryKey": true,
					"required": true,
					"system": true,
					"type": "text"
				},
				{
					"exceptDomains": null,
					"hidden": false,
					"id": "_clone_hbA9",
					"name": "email",
					"onlyDomains": null,
					"presentable": false,
					"required": true,
					"system": true,
					"type": "email"
				},
				{
					"hidden": false,
					"id": "json799060239",
					"maxSize": 1,
					"name": "total_spend",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "json"
				}
			],
			"id": "pbc_1989023549",
			"indexes": [],
			"listRule": null,
			"name": "spend_by_user",
			"system": false,
			"type": "view",
			"updateRule": null,
			"viewQuery": "SELECT\n  u.id,\n  u.email,\n  SUM(au.total_cost) AS total_spend\nFROM\n  ai_usage AS au\nLEFT JOIN\n  users AS u ON au.user = u.id\nGROUP BY\n  au.user, u.email\nORDER BY\n  total_spend DESC;",
			"viewRule": null
		}`

		collection := &core.Collection{}
		if err := json.Unmarshal([]byte(jsonData), &collection); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_1989023549")
		if err != nil {
			return err
		}

		return app.Delete(collection)
	})
}
