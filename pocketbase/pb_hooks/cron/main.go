package cron

import (
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
)

func Init(app *pocketbase.PocketBase) error {
	app.Cron().MustAdd("consolidateUsageRecords", "0 0 * * *", func() {
		stmt := `
			SELECT task, provider, model, user, COALESCE(book, '') as book, 
				   COUNT(*) as count,
				   SUM(input_tokens) as total_input_tokens, 
				   SUM(output_tokens) as total_output_tokens,
				   SUM(input_cost) as total_input_cost,
				   SUM(output_cost) as total_output_cost,
				   SUM(total_cost) as total_total_cost,
				   GROUP_CONCAT(id) as ids
			FROM ai_usage 
			GROUP BY task, provider, model, user, COALESCE(book, '') 
			HAVING COUNT(*) > 1
		`

		type DuplicateGroup struct {
			Task              string  `db:"task" json:"task"`
			Provider          string  `db:"provider" json:"provider"`
			Model             string  `db:"model" json:"model"`
			User              string  `db:"user" json:"user"`
			Book              string  `db:"book" json:"book"`
			Count             int     `db:"count" json:"count"`
			TotalInputTokens  int     `db:"total_input_tokens" json:"total_input_tokens"`
			TotalOutputTokens int     `db:"total_output_tokens" json:"total_output_tokens"`
			TotalInputCost    float64 `db:"total_input_cost" json:"total_input_cost"`
			TotalOutputCost   float64 `db:"total_output_cost" json:"total_output_cost"`
			TotalTotalCost    float64 `db:"total_total_cost" json:"total_total_cost"`
			Ids               string  `db:"ids" json:"ids"`
		}

		duplicates := []DuplicateGroup{}
		err := app.DB().NewQuery(stmt).All(&duplicates)
		if err != nil {
			app.Logger().Error("failed to find duplicate usage records", "error", err)
			return
		}

		for _, group := range duplicates {
			var filterCondition string
			var params dbx.Params

			if group.Book == "" {
				filterCondition = "task = {:task} && provider = {:provider} && model = {:model} && user = {:user} && (book = '' || book = null)"
				params = dbx.Params{
					"task":     group.Task,
					"provider": group.Provider,
					"model":    group.Model,
					"user":     group.User,
				}
			} else {
				filterCondition = "task = {:task} && provider = {:provider} && model = {:model} && user = {:user} && book = {:book}"
				params = dbx.Params{
					"task":     group.Task,
					"provider": group.Provider,
					"model":    group.Model,
					"user":     group.User,
					"book":     group.Book,
				}
			}

			firstRecord, err := app.FindFirstRecordByFilter("ai_usage", filterCondition, params)
			if err != nil {
				app.Logger().Error("failed to find first record for consolidation", "error", err)
				continue
			}

			firstRecord.Set("input_tokens", group.TotalInputTokens)
			firstRecord.Set("output_tokens", group.TotalOutputTokens)
			firstRecord.Set("input_cost", group.TotalInputCost)
			firstRecord.Set("output_cost", group.TotalOutputCost)
			firstRecord.Set("total_cost", group.TotalTotalCost)
			if err := app.Save(firstRecord); err != nil {
				app.Logger().Error("failed to update consolidated record", "error", err)
				continue
			}

			var deleteStmt string
			var deleteParams dbx.Params

			if group.Book == "" {
				deleteStmt = `
					DELETE FROM ai_usage 
					WHERE task = {:task} 
					  AND provider = {:provider} 
					  AND model = {:model} 
					  AND user = {:user} 
					  AND (book = '' OR book IS NULL)
					  AND id != {:keep_id}
				`
				deleteParams = dbx.Params{
					"task":     group.Task,
					"provider": group.Provider,
					"model":    group.Model,
					"user":     group.User,
					"keep_id":  firstRecord.Id,
				}
			} else {
				deleteStmt = `
					DELETE FROM ai_usage 
					WHERE task = {:task} 
					  AND provider = {:provider} 
					  AND model = {:model} 
					  AND user = {:user} 
					  AND book = {:book} 
					  AND id != {:keep_id}
				`
				deleteParams = dbx.Params{
					"task":     group.Task,
					"provider": group.Provider,
					"model":    group.Model,
					"user":     group.User,
					"book":     group.Book,
					"keep_id":  firstRecord.Id,
				}
			}

			_, err = app.DB().NewQuery(deleteStmt).Bind(deleteParams).Execute()

			if err != nil {
				app.Logger().Error("failed to delete duplicate records", "error", err)
				continue
			}

			app.Logger().Info("consolidated AI usage records",
				"group", group.Task+"-"+group.Provider+"-"+group.Model,
				"duplicates_removed", group.Count-1,
				"total_input_tokens", group.TotalInputTokens,
				"total_output_tokens", group.TotalOutputTokens,
				"total_input_cost", group.TotalInputCost,
				"total_output_cost", group.TotalOutputCost,
				"total_cost", group.TotalTotalCost)
		}
	})

	return nil
}
