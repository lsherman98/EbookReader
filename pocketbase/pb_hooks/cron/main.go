package cron

import (
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
)

func Init(app *pocketbase.PocketBase) error {

	app.Cron().MustAdd("consolidateUsageRecords", "0 0 * * *", func() {
		stmt := `
			SELECT task, provider, model, user, book, 
				   COUNT(*) as count,
				   SUM(input_tokens) as total_input_tokens, 
				   SUM(output_tokens) as total_output_tokens,
				   GROUP_CONCAT(id) as ids
			FROM ai_usage 
			GROUP BY task, provider, model, user, book 
			HAVING COUNT(*) > 1
		`

		type DuplicateGroup struct {
			Task              string `db:"task" json:"task"`
			Provider          string `db:"provider" json:"provider"`
			Model             string `db:"model" json:"model"`
			User              string `db:"user" json:"user"`
			Book              string `db:"book" json:"book"`
			Count             int    `db:"count" json:"count"`
			TotalInputTokens  int    `db:"total_input_tokens" json:"total_input_tokens"`
			TotalOutputTokens int    `db:"total_output_tokens" json:"total_output_tokens"`
			Ids               string `db:"ids" json:"ids"`
		}

		duplicates := []DuplicateGroup{}
		err := app.DB().NewQuery(stmt).All(&duplicates)
		if err != nil {
			app.Logger().Error("failed to find duplicate usage records", "error", err)
			return
		}

		for _, group := range duplicates {
			firstRecord, err := app.FindFirstRecordByFilter("ai_usage",
				"task = {:task} && provider = {:provider} && model = {:model} && user = {:user} && book = {:book}",
				dbx.Params{
					"task":     group.Task,
					"provider": group.Provider,
					"model":    group.Model,
					"user":     group.User,
					"book":     group.Book,
				})

			if err != nil {
				app.Logger().Error("failed to find first record for consolidation", "error", err)
				continue
			}

			firstRecord.Set("input_tokens", group.TotalInputTokens)
			firstRecord.Set("output_tokens", group.TotalOutputTokens)

			if err := app.Save(firstRecord); err != nil {
				app.Logger().Error("failed to update consolidated record", "error", err)
				continue
			}

			deleteStmt := `
				DELETE FROM ai_usage 
				WHERE task = {:task} 
				  AND provider = {:provider} 
				  AND model = {:model} 
				  AND user = {:user} 
				  AND book = {:book} 
				  AND id != {:keep_id}
			`

			_, err = app.DB().NewQuery(deleteStmt).Bind(dbx.Params{
				"task":     group.Task,
				"provider": group.Provider,
				"model":    group.Model,
				"user":     group.User,
				"book":     group.Book,
				"keep_id":  firstRecord.Id,
			}).Execute()

			if err != nil {
				app.Logger().Error("failed to delete duplicate records", "error", err)
				continue
			}

			app.Logger().Info("consolidated AI usage records",
				"group", group.Task+"-"+group.Provider+"-"+group.Model,
				"duplicates_removed", group.Count-1,
				"total_input_tokens", group.TotalInputTokens,
				"total_output_tokens", group.TotalOutputTokens)
		}
	})

	return nil
}
