package migrations

import (
	"encoding/json"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_1996445397")
		if err != nil {
			return err
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"indexes": [
				"CREATE INDEX idx_vectors ON vectors (title, content);",
				"CREATE INDEX ` + "`" + `idx_K0Gr50yF3E` + "`" + ` ON ` + "`" + `vectors` + "`" + ` (` + "`" + `vector_id` + "`" + `)"
			]
		}`), &collection); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_1996445397")
		if err != nil {
			return err
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"indexes": [
				"CREATE INDEX idx_vectors ON vectors (title, content);"
			]
		}`), &collection); err != nil {
			return err
		}

		return app.Save(collection)
	})
}
