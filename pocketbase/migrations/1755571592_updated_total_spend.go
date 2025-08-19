package migrations

import (
	"encoding/json"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_3604446213")
		if err != nil {
			return err
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"viewQuery": "SELECT\n  (ROW_NUMBER() OVER()) as id,\n  printf('$%.2f', SUM(CASE WHEN provider = 'openai' THEN total_cost ELSE 0 END)) AS openai_total,\n  printf('$%.2f', SUM(CASE WHEN provider = 'google' THEN total_cost ELSE 0 END)) AS google_total,\n  printf('$%.2f', SUM(total_cost)) AS grand_total\nFROM\n  ai_usage;"
		}`), &collection); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_3604446213")
		if err != nil {
			return err
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"viewQuery": "SELECT\n  (ROW_NUMBER() OVER()) as id,\n  SUM(CASE WHEN provider = 'openai' THEN total_cost ELSE 0 END) AS openai_total,\n  SUM(CASE WHEN provider = 'google' THEN total_cost ELSE 0 END) AS google_total,\n  SUM(total_cost) AS grand_total\nFROM\n  ai_usage;"
		}`), &collection); err != nil {
			return err
		}

		return app.Save(collection)
	})
}
