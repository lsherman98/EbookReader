package highlight_hooks

import (
	"strings"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"golang.org/x/net/html"
)

func Init(app *pocketbase.PocketBase) error {
	app.OnRecordDeleteRequest("highlights").BindFunc(func(e *core.RecordRequestEvent) error {
		chapterId := e.Record.GetString("chapter")
		chapter, err := e.App.FindRecordById("chapters", chapterId)
		if err != nil {
			return err
		}

		highlightText := e.Record.GetString("text")
		htmlContent := chapter.GetString("content")

		updatedHTML, err := removeMarkTagWithText(htmlContent, highlightText)
		if err != nil {
			return err
		}

		chapter.Set("content", updatedHTML)
		if err := e.App.Save(chapter); err != nil {
			return err
		}

		return e.Next()
	})

	return nil
}

func removeMarkTagWithText(htmlContent, targetText string) (string, error) {
	doc, err := html.Parse(strings.NewReader(htmlContent))
	if err != nil {
		return "", err
	}

	var traverse func(*html.Node) bool
	traverse = func(n *html.Node) bool {
		if n.Type == html.ElementNode && n.Data == "mark" {
			// Get the text content of this mark tag
			var textContent strings.Builder
			var extractText func(*html.Node)
			extractText = func(node *html.Node) {
				if node.Type == html.TextNode {
					textContent.WriteString(node.Data)
				}
				for c := node.FirstChild; c != nil; c = c.NextSibling {
					extractText(c)
				}
			}
			extractText(n)

			// If the text matches, replace the mark tag with its text content
			if strings.TrimSpace(textContent.String()) == strings.TrimSpace(targetText) {
				// Replace the mark node with its text content
				textNode := &html.Node{
					Type: html.TextNode,
					Data: textContent.String(),
				}
				n.Parent.InsertBefore(textNode, n)
				n.Parent.RemoveChild(n)
				return true // Found and removed, stop traversing
			}
		}

		// Continue traversing children
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			if traverse(c) {
				return true // Found in child, stop traversing
			}
		}
		return false
	}

	traverse(doc)

	var buf strings.Builder
	html.Render(&buf, doc)
	return buf.String(), nil
}
