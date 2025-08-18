package book_hooks

import (
	"io"
	"regexp"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/timsims/pamphlet"
)

func Init(app *pocketbase.PocketBase) error {
	app.OnRecordCreateRequest("books").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Auth == nil {
			return e.ForbiddenError("You must be logged in to upload a book.", nil)
		}

		user := e.Auth
		if !user.GetBool("paid") {
			uploadCountRecord, err := e.App.FindRecordById("upload_count", user.Id)
			if err != nil {
				return e.Next()
			}

			if uploadCountRecord != nil {
				uploadCount := uploadCountRecord.GetInt("uploadCount")
				if uploadCount >= 5 {
					return e.ForbiddenError("Upload limit reached. Please upgrade to continue uploading files.", nil)
				}
			}
		}

		return e.Next()
	})

	app.OnRecordAfterCreateSuccess("books").BindFunc(func(e *core.RecordEvent) error {
		lastReadCollection, err := app.FindCollectionByNameOrId("last_read")
		if err != nil {
			return err
		}

		chatsCollection, err := app.FindCollectionByNameOrId("chats")
		if err != nil {
			return err
		}

		chaptersCollection, err := app.FindCollectionByNameOrId("chapters")
		if err != nil {
			return err
		}

		book := e.Record
		user := book.GetString("user")

		lastRead, _ := e.App.FindFirstRecordByData("last_read", "user", user)
		setLastRead := false
		if lastRead == nil {
			setLastRead = true
			lastRead = core.NewRecord(lastReadCollection)
			setLastReadFields(lastRead, user, book.Id)
		}

		chatRecord := core.NewRecord(chatsCollection)
		setChatFields(chatRecord, user, book.Id, "New Chat")

		fileKey := book.BaseFilesPath() + "/" + book.GetString("file")

		fsys, err := e.App.NewFilesystem()
		if err != nil {
			return err
		}
		defer fsys.Close()

		r, err := fsys.GetReader(fileKey)
		if err != nil {
			return err
		}
		defer r.Close()

		data, err := io.ReadAll(r)
		if err != nil {
			return err
		}

		parser, err := pamphlet.OpenBytes(data)
		if err != nil {
			return err
		}
		defer parser.Close()

		parsedBook := parser.GetBook()

		var chapters []*core.Record
		re := regexp.MustCompile(`(?s)^.*@page\s*\{[^}]*\}\s*`)

		for _, chapter := range parsedBook.Chapters {
			if chapter.Title == "" {
				continue
			}

			content, err := chapter.GetContent()
			if err != nil {
				continue
			}

			content = re.ReplaceAllString(content, "")
			html := "<!DOCTYPE html>" + content

			chapterRecord := core.NewRecord(chaptersCollection)
			setChapterFields(chapterRecord, &chapter, html, book.Id, user)

			chapters = append(chapters, chapterRecord)
		}

		if setLastRead {
			if err := e.App.Save(lastRead); err != nil {
				return err
			}
		}

		if err := e.App.Save(chatRecord); err != nil {
			return err
		}

		var chapterIds []string
		for _, record := range chapters {
			if err := e.App.Save(record); err != nil {
				return err
			}
			chapterIds = append(chapterIds, record.Id)
		}

		setBookFields(book, parsedBook, chapterIds)
		if err := e.App.Save(book); err != nil {
			return err
		}

		return e.Next()
	})

	app.OnRecordViewRequest("books").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.HasSuperuserAuth() {
			return e.Next()
		}

		if e.Auth == nil {
			return e.Next()
		}

		user := e.Auth.Id
		book := e.Record.Id

		lastReadRecord, err := e.App.FindFirstRecordByData("last_read", "user", user)
		if lastReadRecord == nil || err != nil {
			err = createLastReadRecord(e.App, user, book)
			if err != nil {
				return err
			}

			return e.Next()
		}

		currentBookId := lastReadRecord.GetString("book")

		if currentBookId != book {
			bookRecord, err := e.App.FindRecordById("books", book)
			if err != nil {
				return err
			}

			currentChapter := bookRecord.GetString("current_chapter")

			lastReadRecord.Set("book", book)
			lastReadRecord.Set("chapter", currentChapter)

			err = e.App.Save(lastReadRecord)
			if err != nil {
				return e.Next()
			}
		}

		return e.Next()
	})

	return nil
}

func setBookFields(book *core.Record, parsedBook *pamphlet.Book, chapterIds []string) {
	book.Set("title", parsedBook.Title)
	book.Set("author", parsedBook.Author)
	book.Set("description", parsedBook.Description)
	book.Set("language", parsedBook.Language)
	book.Set("date", parsedBook.Date)
	book.Set("subject", parsedBook.Subject)
	book.Set("chapters+", chapterIds)
	book.Set("current_chapter", chapterIds[0])
}

func setChapterFields(chapterRecord *core.Record, chapter *pamphlet.Chapter, html string, bookId string, userId string) {
	chapterRecord.Set("book", bookId)
	chapterRecord.Set("title", chapter.Title)
	chapterRecord.Set("order", chapter.Order)
	chapterRecord.Set("href", chapter.Href)
	chapterRecord.Set("has_toc", chapter.HasToc)
	chapterRecord.Set("content", html)
	chapterRecord.Set("user", userId)
}

func setLastReadFields(lastRead *core.Record, userId, bookId string) {
	lastRead.Set("user", userId)
	lastRead.Set("book", bookId)
}

func setChatFields(chatRecord *core.Record, userId, bookId, title string) {
	chatRecord.Set("user", userId)
	chatRecord.Set("book", bookId)
	chatRecord.Set("title", title)
}

func createLastReadRecord(app core.App, userId, bookId string) error {
	bookRecord, err := app.FindRecordById("books", bookId)
	if err != nil {
		return err
	}

	lastReadCollection, err := app.FindCollectionByNameOrId("last_read")
	if err != nil {
		return err
	}

	currentChapter := bookRecord.GetString("current_chapter")

	lastReadRecord := core.NewRecord(lastReadCollection)
	lastReadRecord.Set("user", userId)
	lastReadRecord.Set("book", bookId)
	lastReadRecord.Set("chapter", currentChapter)

	err = app.Save(lastReadRecord)
	if err != nil {
		return err
	}

	return nil
}
