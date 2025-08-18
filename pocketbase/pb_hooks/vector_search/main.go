package vector_search

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"

	sqlite_vec "github.com/asg017/sqlite-vec-go-bindings/cgo"
	"github.com/google/generative-ai-go/genai"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/routine"
	"github.com/pocketbase/pocketbase/tools/types"
)

type VectorCollection struct {
	Name        string
	ExtraFields []core.Field
}

var ColPrefix = "$$$"
var client *genai.Client

func Init(app *pocketbase.PocketBase, collections ...VectorCollection) error {
	sqlite_vec.Auto()

	var err error
	client, err = createGoogleAiClient()
	if err != nil {
		return err
	}

	app.Cron().MustAdd("cleanupOrphanedEmbeddings", "0 0 * * *", func() {
		for _, target := range collections {
			if target.Name == "vectors" {
				stmt := "DELETE FROM " + target.Name + "_embeddings WHERE id NOT IN (SELECT vector_id FROM " + target.Name + " WHERE vector_id IS NOT NULL);"
				if _, err := app.DB().NewQuery(stmt).Execute(); err != nil {
					app.Logger().Error("failed to cleanup orphaned embeddings", "error", err)
				}
			}
		}
	})

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		for _, target := range collections {
			collection, _ := app.FindCollectionByNameOrId(target.Name)
			if collection == nil {
				err := createCollection(app, target.Name, target.ExtraFields...)
				if err != nil {
					app.Logger().Error(fmt.Sprint(err))
					return err
				}
			}
		}
		return e.Next()
	})

	app.OnRecordAfterCreateSuccess().BindFunc(func(e *core.RecordEvent) error {
		tbl := e.Record.TableName()
		for _, target := range collections {
			if tbl == target.Name {
				err := modelModify(app, target.Name, client, e)
				if err != nil {
					app.Logger().Error(fmt.Sprint(err))
					return err
				}
			}
		}
		return e.Next()
	})

	app.OnRecordAfterUpdateSuccess().BindFunc(func(e *core.RecordEvent) error {
		tbl := e.Record.TableName()
		for _, target := range collections {
			if tbl == target.Name {
				err := modelModify(app, target.Name, client, e)
				if err != nil {
					app.Logger().Error(fmt.Sprint(err))
					return err
				}
			}
		}
		return e.Next()
	})

	app.OnRecordAfterDeleteSuccess().BindFunc(func(e *core.RecordEvent) error {
		tbl := e.Record.TableName()
		for _, target := range collections {
			if tbl == target.Name {
				err := modelDelete(app, target.Name, e)
				if err != nil {
					app.Logger().Error(fmt.Sprint(err))
					return err
				}
			}
		}
		return e.Next()
	})

	app.OnCollectionAfterDeleteSuccess().BindFunc(func(e *core.CollectionEvent) error {
		for _, target := range collections {
			if e.Collection.Name == target.Name {
				err := deleteCollection(app, target.Name)
				if err != nil {
					app.Logger().Error(fmt.Sprint(err))
					return err
				}
			}
		}
		return e.Next()
	})

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		e.Router.GET("/vector-search", func(e *core.RequestEvent) error {
			title := e.Request.URL.Query().Get("title")
			content := e.Request.URL.Query().Get("search")
			k := e.Request.URL.Query().Get("k")
			chapter := e.Request.URL.Query().Get("chapter")
			book := e.Request.URL.Query().Get("book")
			kNum := 5
			if k != "" {
				val, err := strconv.Atoi(k)
				if err == nil {
					kNum = val
				}
			}

			if content == "" {
				return e.NoContent(204)
			}

			results, err := Search(app, title, content, book, chapter, kNum)
			if err != nil {
				app.Logger().Error(fmt.Sprint(err))
				return err
			}

			return e.JSON(200, results)
		})

		e.Router.GET("/embeddings", func(e *core.RequestEvent) error {
			target := "vectors"
			if _, err := app.FindCollectionByNameOrId(target); err != nil {
				app.Logger().Error(fmt.Sprint(err))
				return err
			}

			stmt := "SELECT id, embedding FROM " + target + "_embeddings;"

			results := []dbx.NullStringMap{}
			err := app.DB().
				NewQuery(stmt).
				All(&results)
			if err != nil {
				app.Logger().Error(fmt.Sprint(err))
				return err
			}

			e.Response.Header().Set("Content-Type", "application/json")
			items := []map[string]any{}
			for _, result := range results {
				m := make(map[string]interface{})
				for key := range result {
					val := result[key]
					value, err := val.Value()
					if err != nil || !val.Valid {
						m[key] = nil
					} else {
						m[key] = value
					}
				}
				items = append(items, m)
			}

			return e.JSON(200, items)
		})
		return e.Next()
	})
	return nil
}

func Search(app *pocketbase.PocketBase, title, content, book, chapter string, kNum int) ([]map[string]any, error) {
	target := "vectors"
	if _, err := app.FindCollectionByNameOrId(target); err != nil {
		app.Logger().Error(fmt.Sprint(err))
		return nil, err
	}

	vector, err := googleAiEmbedContent(client, genai.TaskTypeRetrievalQuery, title, genai.Text(content))
	if err != nil {
		return nil, err
	}
	jsonVec, err := json.Marshal(vector)
	if err != nil {
		return nil, err
	}

	params := dbx.Params{
		"embedding": string(jsonVec),
		"k":         kNum,
	}

	whereClauses := []string{}
	if book != "" {
		whereClauses = append(whereClauses, "book = {:book}")
		params["book"] = book
	}
	if chapter != "" {
		whereClauses = append(whereClauses, "chapter = {:chapter}")
		params["chapter"] = chapter
	}

	stmt := ""
	if len(whereClauses) > 0 {
		stmt += "WITH filtered_vectors AS (SELECT vector_id FROM " + target + " WHERE " + strings.Join(whereClauses, " AND ") + " AND vector_id IS NOT NULL) "
		stmt += "SELECT v.id, ve.distance, v.content, v.title, v.book, v.chapter, v.\"index\", v.created, v.updated "
		stmt += "FROM " + target + "_embeddings ve "
		stmt += "JOIN " + target + " v ON v.vector_id = ve.id "
		stmt += "WHERE ve.embedding MATCH {:embedding} AND k = {:k} AND ve.id IN (SELECT vector_id FROM filtered_vectors);"
	} else {
		stmt += "SELECT v.id, ve.distance, v.content, v.title, v.book, v.chapter, v.\"index\", v.created, v.updated "
		stmt += "FROM " + target + "_embeddings ve "
		stmt += "JOIN " + target + " v ON v.vector_id = ve.id "
		stmt += "WHERE ve.embedding MATCH {:embedding} AND k = {:k};"
	}

	results := []dbx.NullStringMap{}
	err = app.DB().
		NewQuery(stmt).
		Bind(params).
		All(&results)
	if err != nil {
		app.Logger().Error(fmt.Sprint(err))
		return nil, err
	}

	items := []map[string]any{}
	for _, result := range results {
		m := make(map[string]interface{})
		for key := range result {
			val := result[key]
			value, err := val.Value()
			if err != nil || !val.Valid {
				m[key] = nil
			} else {
				m[key] = value
			}
		}
		items = append(items, m)
	}
	return items, nil
}

func deleteCollection(app *pocketbase.PocketBase, target string) error {
	if _, err := app.DB().
		NewQuery("DELETE FROM " + target + "_embeddings;").
		Execute(); err != nil {
		return err
	}
	if _, err := app.DB().
		NewQuery("DROP TABLE IF EXISTS " + target + "_embeddings;").
		Execute(); err != nil {
		return err
	}
	return nil
}

func modelDelete(app *pocketbase.PocketBase, target string, e *core.RecordEvent) error {
	return deleteEmbeddingsForRecord(app, target, e)
}

func trackAIUsage(app *pocketbase.PocketBase, record *core.Record, title, content string) {
	totalChars := len(title) + len(content)
	approxTokens := totalChars / 4
	if totalChars%4 > 0 {
		approxTokens++
	}

	inputCost := float64(approxTokens) * 0.15 / 1000000
	outputCost := 0.0
	totalCost := inputCost

	AIUsageCollection, err := app.FindCollectionByNameOrId("ai_usage")
	if err != nil {
		app.Logger().Error("Error finding ai_usage collection:", "error", err.Error())
		return
	}

	bookId := record.GetString("book")
	bookRecord, _ := app.FindRecordById("books", bookId)
	user := bookRecord.GetString("user")

	var model string = os.Getenv("GOOGLE_EMBEDDING_MODEL")

	existingRecord, err := app.FindFirstRecordByFilter("ai_usage",
		"book = {:book} && user = {:user} && task = 'embed'",
		dbx.Params{
			"book": bookId,
			"user": user,
		})

	if err == nil && existingRecord != nil {
		currentTokens := existingRecord.GetInt("input_tokens")
		currentInputCost := existingRecord.GetFloat("input_cost")
		currentOutputCost := existingRecord.GetFloat("output_cost")
		currentTotalCost := existingRecord.GetFloat("total_cost")

		existingRecord.Set("input_tokens", currentTokens+approxTokens)
		existingRecord.Set("input_cost", currentInputCost+inputCost)
		existingRecord.Set("output_cost", currentOutputCost+outputCost)
		existingRecord.Set("total_cost", currentTotalCost+totalCost)

		if err := app.Save(existingRecord); err != nil {
			app.Logger().Error("Error updating AI usage record:", "error", err.Error())
		}
	} else {
		AIUsageRecord := core.NewRecord(AIUsageCollection)
		AIUsageRecord.Set("task", "embed")
		AIUsageRecord.Set("provider", "google")
		AIUsageRecord.Set("model", model)
		AIUsageRecord.Set("input_tokens", approxTokens)
		AIUsageRecord.Set("output_tokens", 0)
		AIUsageRecord.Set("input_cost", inputCost)
		AIUsageRecord.Set("output_cost", outputCost)
		AIUsageRecord.Set("total_cost", totalCost)
		AIUsageRecord.Set("book", bookId)
		AIUsageRecord.Set("user", user)

		if err := app.Save(AIUsageRecord); err != nil {
			app.Logger().Error("Error saving AI usage record:", "error", err.Error())
		}
	}
}

func modelModify(app *pocketbase.PocketBase, target string, client *genai.Client, e *core.RecordEvent) error {
	record, err := e.App.FindRecordById(e.Record.TableName(), e.Record.Id)
	if err != nil {
		return err
	}
	title := record.GetString("title")
	content := record.GetString("content")

	trackAIUsage(app, record, title, content)

	if content != "" {
		routine.FireAndForget(func() {
			result, err := googleAiEmbedContent(client, genai.TaskTypeRetrievalDocument, title, genai.Text(content))
			if err != nil {
				e.App.Logger().Error("Error embedding content:", "error", err.Error())
				return
			}

			vector := ""
			jsonVec, err := json.Marshal(result)
			if err != nil {
				vector = "[]"
			} else {
				vector = string(jsonVec)
			}

			deleteEmbeddingsForRecord(app, target, e)

			{
				stmt := "INSERT INTO " + target + "_embeddings (embedding) "
				stmt += "VALUES ({:embedding});"
				res, err := app.DB().NewQuery(stmt).Bind(dbx.Params{
					"embedding": vector,
				}).Execute()
				if err != nil {
					e.App.Logger().Error("Error inserting vector embedding:", "error", err.Error())
					return
				}
				vectorId, err := res.LastInsertId()
				if err != nil {
					e.App.Logger().Error("Error getting last insert ID:", "error", err.Error())
					return
				}
				record.Set("vector_id", vectorId)
			}

			if err := app.UnsafeWithoutHooks().Save(record); err != nil {
				e.App.Logger().Error("Error saving record with vector_id:", "error", err.Error())
				return
			}
		})
	}
	return nil
}

func deleteEmbeddingsForRecord(app *pocketbase.PocketBase, target string, e *core.RecordEvent) error {
	record := e.Record

	type Meta struct {
		Id string `db:"id" json:"id"`
	}
	vectorId := record.GetInt("vector_id")
	if vectorId == 0 {
		return nil
	}
	items := []*Meta{}
	stmt := "SELECT id FROM " + target + "_embeddings "
	stmt += "WHERE id = {:id};"
	err := app.DB().NewQuery(stmt).Bind(dbx.Params{
		"id": vectorId,
	}).All(&items)
	if err != nil {
		return nil
	}

	stmt = "DELETE FROM " + target + "_embeddings "
	stmt += "WHERE id = {:id}"

	for _, item := range items {
		_, err = app.DB().NewQuery(stmt).Bind(dbx.Params{
			"id": item.Id,
		}).Execute()
		if err != nil {
			return nil
		}
	}

	return nil
}

func createCollection(app *pocketbase.PocketBase, target string, extraFields ...core.Field) error {
	bookCollection, err := app.FindCollectionByNameOrId("books")
	if err != nil {
		return err
	}

	chaptersCollection, err := app.FindCollectionByNameOrId("chapters")
	if err != nil {
		return err
	}

	fields := []core.Field{
		&core.TextField{
			Name: "title",
		},
		&core.TextField{
			Name:     "content",
			Required: true,
		},
		&core.NumberField{
			Name: "vector_id",
		},
		&core.AutodateField{
			Name:     "created",
			OnCreate: true,
		},
		&core.AutodateField{
			Name:     "updated",
			OnCreate: true,
			OnUpdate: true,
		},
		&core.RelationField{
			Name:         "book",
			CollectionId: bookCollection.Id,
		},
		&core.RelationField{
			Name:         "chapter",
			CollectionId: chaptersCollection.Id,
		},
		&core.NumberField{
			Name: "index",
		},
	}

	for _, field := range extraFields {
		if field.ColumnType(app) == "relation" {
			colId := field.GetId()
			if strings.HasPrefix(colId, ColPrefix) {
				colId = strings.ReplaceAll(colId, ColPrefix, "")
				if col, err := app.FindCollectionByNameOrId(colId); err != nil {
					app.Logger().Error(fmt.Sprint(err))
					return err
				} else {
					field = &core.RelationField{
						CollectionId: col.Id,
						Name:         field.GetName(),
					}
				}
			}

		}
	}

	fields = append(fields, extraFields...)
	collection := core.NewBaseCollection(target)
	collection.Type = core.CollectionTypeBase
	collection.Fields = core.NewFieldsList(fields...)
	collection.Indexes = types.JSONArray[string]{
		"CREATE INDEX idx_" + target + " ON " + target + " (title, content);",
	}

	if err := app.Save(collection); err != nil {
		return err
	}

	stmt := "CREATE VIRTUAL TABLE IF NOT EXISTS " + target + "_embeddings using vec0( "
	stmt += "	id INTEGER PRIMARY KEY AUTOINCREMENT, "
	stmt += "	embedding float[3072] "
	stmt += ");"
	_, err = app.DB().NewQuery(stmt).Execute()
	if err != nil {
		return err
	}

	return nil
}
