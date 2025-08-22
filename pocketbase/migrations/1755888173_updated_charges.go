package migrations

import (
	"encoding/json"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_3174063690")
		if err != nil {
			return err
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"indexes": [
				"CREATE INDEX ` + "`" + `idx_SVjRyNU0v4` + "`" + ` ON ` + "`" + `stripe_charges` + "`" + ` (` + "`" + `user` + "`" + `)"
			],
			"name": "stripe_charges"
		}`), &collection); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_3174063690")
		if err != nil {
			return err
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"indexes": [
				"CREATE INDEX ` + "`" + `idx_SVjRyNU0v4` + "`" + ` ON ` + "`" + `charges` + "`" + ` (` + "`" + `user` + "`" + `)"
			],
			"name": "charges"
		}`), &collection); err != nil {
			return err
		}

		return app.Save(collection)
	})
}
