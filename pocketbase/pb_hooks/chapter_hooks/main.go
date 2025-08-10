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

		htmlNodes, err := parseHTMLIntoNodes(content)
		if err != nil {
			return err
		}

		routine.FireAndForget(func() {
			for index, nodeHTML := range htmlNodes {
				vector := core.NewRecord(vectorCollection)
				vector.Set("title", title)
				vector.Set("content", nodeHTML)
				vector.Set("chapter", e.Record.Id)
				vector.Set("book", book)
				vector.Set("index", index)

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
			return err
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
				return err
			}
		}

		return e.Next()
	})

	return nil
}

func parseHTMLIntoNodes(htmlContent string) ([]string, error) {
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
	nodeCount := 0

	var traverse func(*html.Node, int)
	traverse = func(n *html.Node, depth int) {
		if n.Type == html.ElementNode {
			if ignoredTags[n.Data] {
				for c := n.FirstChild; c != nil; c = c.NextSibling {
					traverse(c, depth+1)
				}
				return
			}

			hasElementChildren := false
			for c := n.FirstChild; c != nil; c = c.NextSibling {
				if c.Type == html.ElementNode && !ignoredTags[c.Data] {
					hasElementChildren = true
					break
				}
			}

			if !hasElementChildren {
				var buf strings.Builder
				html.Render(&buf, n)
				nodeHTML := buf.String()
				trimmed := strings.TrimSpace(nodeHTML)

				if trimmed != "" {
					nodes = append(nodes, nodeHTML)
					nodeCount++
				}
			} else {
				for c := n.FirstChild; c != nil; c = c.NextSibling {
					traverse(c, depth+1)
				}
			}
		} else if n.Type == html.TextNode {
			text := strings.TrimSpace(n.Data)
			if text != "" && len(text) > 10 {
				nodes = append(nodes, text)
				nodeCount++
			}
		} else {
			for c := n.FirstChild; c != nil; c = c.NextSibling {
				traverse(c, depth+1)
			}
		}
	}

	traverse(doc, 0)

	return nodes, nil
}
