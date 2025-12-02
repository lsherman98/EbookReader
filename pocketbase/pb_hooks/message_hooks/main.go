package message_hooks

import (
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

func Init(app *pocketbase.PocketBase) error {
	app.OnRecordAfterCreateSuccess("messages").BindFunc(func(e *core.RecordEvent) error {
		record, err := e.App.FindRecordById("chats", e.Record.GetString("chat"))
		if err != nil {
			return err
		}

		record.Set("messages+", e.Record.Id)
		err = e.App.Save(record)
		if err != nil {
			return err
		}

		return e.Next()
	})

	return nil
}
