package main

import (
	"database/sql"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/lsherman98/ai-reader/pocketbase/pb_hooks/ai_chat"
	"github.com/lsherman98/ai-reader/pocketbase/pb_hooks/book_hooks"
	"github.com/lsherman98/ai-reader/pocketbase/pb_hooks/chapter_hooks"
	"github.com/lsherman98/ai-reader/pocketbase/pb_hooks/chats"
	"github.com/lsherman98/ai-reader/pocketbase/pb_hooks/cron"
	"github.com/lsherman98/ai-reader/pocketbase/pb_hooks/full_text_search"
	"github.com/lsherman98/ai-reader/pocketbase/pb_hooks/highlight_hooks"
	"github.com/lsherman98/ai-reader/pocketbase/pb_hooks/message_hooks"
	"github.com/lsherman98/ai-reader/pocketbase/pb_hooks/stripe_webhooks"
	"github.com/lsherman98/ai-reader/pocketbase/pb_hooks/vector_search"
	"github.com/mattn/go-sqlite3"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"

	_ "github.com/lsherman98/ai-reader/pocketbase/migrations"
	// _ "github.com/marcboeker/go-duckdb/v2"
)

func init() {
	sql.Register("pb_sqlite3",
		&sqlite3.SQLiteDriver{
			ConnectHook: func(conn *sqlite3.SQLiteConn) error {
				_, err := conn.Exec(`
                    PRAGMA busy_timeout       = 10000;
                    PRAGMA journal_mode       = WAL;
                    PRAGMA journal_size_limit = 200000000;
                    PRAGMA synchronous        = NORMAL;
                    PRAGMA foreign_keys       = ON;
                    PRAGMA temp_store         = MEMORY;
                    PRAGMA cache_size         = -16000;
                `, nil)

				return err
			},
		},
	)

	dbx.BuilderFuncMap["pb_sqlite3"] = dbx.BuilderFuncMap["sqlite3"]
}

func main() {
	app := pocketbase.NewWithConfig(pocketbase.Config{
		DBConnect: func(dbPath string) (*dbx.DB, error) {
			return dbx.Open("pb_sqlite3", dbPath)
		},
	})

	// duckdb, err := sql.Open("duckdb", "pb_data/auxiliary.db")
	// if err != nil {
	// 	log.Fatal(err)
	// }
	// defer duckdb.Close()

	// err = duckdb.Ping()
	// if err != nil {
	// 	log.Fatal(err)
	// }

	// duckdb.Exec(`CALL start_ui();`)

	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	if err := ai_chat.Init(app); err != nil {
		log.Fatal(err)
	}

	if err := cron.Init(app); err != nil {
		log.Fatal(err)
	}

	if err := stripe_webhooks.Init(app); err != nil {
		log.Fatal(err)
	}

	if err := message_hooks.Init(app); err != nil {
		log.Fatal(err)
	}

	if err := book_hooks.Init(app); err != nil {
		log.Fatal(err)
	}

	if err := chapter_hooks.Init(app); err != nil {
		log.Fatal(err)
	}

	if err := highlight_hooks.Init(app); err != nil {
		log.Fatal(err)
	}

	if err := chats.Init(app); err != nil {
		log.Fatal(err)
	}

	if err := vector_search.Init(app, vector_search.VectorCollection{
		Name: "vectors",
	}); err != nil {
		log.Fatal(err)
	}

	if err := full_text_search.Init(app, "books"); err != nil {
		log.Fatal(err)
	}

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		se.Router.GET("/{path...}", apis.Static(os.DirFS("./pb_public"), true))
		return se.Next()
	})

	isGoRun := strings.HasPrefix(os.Args[0], os.TempDir())
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: isGoRun,
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
