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
					"autogeneratePattern": "[a-z0-9]{15}",
					"hidden": false,
					"id": "text3208210256",
					"max": 15,
					"min": 15,
					"name": "id",
					"pattern": "^[a-z0-9]+$",
					"presentable": false,
					"primaryKey": true,
					"required": true,
					"system": true,
					"type": "text"
				},
				{
					"hidden": false,
					"id": "select1384045349",
					"maxSelect": 1,
					"name": "task",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "select",
					"values": [
						"embed",
						"chat"
					]
				},
				{
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
				},
				{
					"hidden": false,
					"id": "select3616895705",
					"maxSelect": 1,
					"name": "model",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "select",
					"values": [
						"gemini-embedding-001",
						"gpt-4o"
					]
				},
				{
					"hidden": false,
					"id": "number1726912723",
					"max": null,
					"min": null,
					"name": "input_tokens",
					"onlyInt": false,
					"presentable": false,
					"required": false,
					"system": false,
					"type": "number"
				},
				{
					"hidden": false,
					"id": "number2122787687",
					"max": null,
					"min": null,
					"name": "output_tokens",
					"onlyInt": false,
					"presentable": false,
					"required": false,
					"system": false,
					"type": "number"
				},
				{
					"cascadeDelete": false,
					"collectionId": "_pb_users_auth_",
					"hidden": false,
					"id": "relation2375276105",
					"maxSelect": 1,
					"minSelect": 0,
					"name": "user",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "relation"
				},
				{
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
				},
				{
					"hidden": false,
					"id": "autodate2990389176",
					"name": "created",
					"onCreate": true,
					"onUpdate": false,
					"presentable": false,
					"system": false,
					"type": "autodate"
				},
				{
					"hidden": false,
					"id": "autodate3332085495",
					"name": "updated",
					"onCreate": true,
					"onUpdate": true,
					"presentable": false,
					"system": false,
					"type": "autodate"
				}
			],
			"id": "pbc_3423747372",
			"indexes": [],
			"listRule": null,
			"name": "ai_usage",
			"system": false,
			"type": "base",
			"updateRule": null,
			"viewRule": null
		}`

		collection := &core.Collection{}
		if err := json.Unmarshal([]byte(jsonData), &collection); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_3423747372")
		if err != nil {
			return err
		}

		return app.Delete(collection)
	})
}
