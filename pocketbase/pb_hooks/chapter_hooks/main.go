package chapter_hooks

import (
	"log"
	"strings"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/routine"
	"golang.org/x/net/html"
)

func Init(app *pocketbase.PocketBase) error {
	app.OnRecordAfterCreateSuccess("chapters").BindFunc(func(e *core.RecordEvent) error {
		vectorCollection, err := app.FindCollectionByNameOrId("vectors")
		if err != nil {
			return err
		}

		content := e.Record.GetString("content")
		title := e.Record.GetString("title")
		book := e.Record.GetString("book")

		textNodes, err := parseHTMLIntoTextNodes(content)
		if err != nil {
			return err
		}

		routine.FireAndForget(func() {
			for index, textContent := range textNodes {
				vector := core.NewRecord(vectorCollection)
				vector.Set("title", title)
				vector.Set("content", textContent)
				vector.Set("chapter", e.Record.Id)
				vector.Set("book", book)
				vector.Set("index", index)

				e.App.Logger().Info("Saving vector record", "index", index, "content", textContent)

				if err := e.App.Save(vector); err != nil {
					e.App.Logger().Error("Error saving vector record:", "error", err.Error())
					return
				}
			}
		})

		return e.Next()
	})

	app.OnRecordViewRequest("chapters").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Auth == nil {
			return e.Next()
		}

		user := e.Auth.Id
		book := e.Record.GetString("book")

		bookRecord, err := e.App.FindRecordById("books", book)
		if err != nil {
			return err
		}

		bookRecord.Set("current_chapter", e.Record.Id)
		err = app.Save(bookRecord)
		if err != nil {
			return e.Next()
		}

		lastRead, err := e.App.FindFirstRecordByData("last_read", "user", user)
		if err != nil {
			return e.Next()
		}

		if lastRead != nil {
			lastRead.Set("book", book)
			lastRead.Set("chapter", e.Record.Id)

			err = e.App.Save(lastRead)
			if err != nil {
				return e.Next()
			}
		}

		return e.Next()
	})

	return nil
}

func parseHTMLIntoTextNodes(htmlContent string) ([]string, error) {
	doc, err := html.Parse(strings.NewReader(htmlContent))
	if err != nil {
		log.Printf("Failed to parse HTML: %v", err)
		return nil, err
	}

	ignoredTags := map[string]bool{
		"head":  true,
		"meta":  true,
		"link":  true,
		"td":    true,
		"tr":    true,
		"a":     true,
		"title": true,
		"html":  true,
		"body":  true,
		"i":     true,
	}

	var nodes []string

	var bodyNode *html.Node
	var findBody func(*html.Node)
	findBody = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "body" {
			bodyNode = n
			return
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			findBody(c)
		}
	}
	findBody(doc)

	if bodyNode == nil {
		bodyNode = doc
	}

	for child := bodyNode.FirstChild; child != nil; child = child.NextSibling {
		if child.Type == html.ElementNode {
			if !ignoredTags[child.Data] {
				innerText := getInnerText(child)
				if strings.TrimSpace(innerText) != "" {
					nodes = append(nodes, innerText)
				}
			}
		}
	}

	return nodes, nil
}

func getInnerText(n *html.Node) string {
	var text strings.Builder
	var extractText func(*html.Node)
	extractText = func(node *html.Node) {
		if node.Type == html.TextNode {
			text.WriteString(node.Data)
		}
		for c := node.FirstChild; c != nil; c = c.NextSibling {
			extractText(c)
		}
	}
	extractText(n)
	return strings.TrimSpace(text.String())
}
