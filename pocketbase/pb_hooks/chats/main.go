package chats

import (
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

func Init(app *pocketbase.PocketBase) error {

	app.OnRecordDeleteRequest("chats").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Collection.Name != "chats" {
			return nil
		}

		bookId := e.Record.GetString("book")
		userId := e.Record.GetString("user")

		var total int
		err := app.DB().
			Select("COUNT(*)").
			From("chats").
			Where(dbx.NewExp("book = {:book} AND user = {:user}", dbx.Params{"book": bookId, "user": userId})).
			Row(&total)

		if err != nil {
			return err
		}

		if total <= 1 {
			return e.Error(400, "You need to have at least one chat", nil)
		}

		return e.Next()
	})

	return nil
}
