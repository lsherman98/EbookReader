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

	var markTags []*html.Node
	var collectMarkTags func(*html.Node)
	collectMarkTags = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "mark" {
			markTags = append(markTags, n)
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			collectMarkTags(c)
		}
	}
	collectMarkTags(doc)

	extractText := func(node *html.Node) string {
		var textContent strings.Builder
		var traverse func(*html.Node)
		traverse = func(n *html.Node) {
			if n.Type == html.TextNode {
				textContent.WriteString(n.Data)
			}
			for c := n.FirstChild; c != nil; c = c.NextSibling {
				traverse(c)
			}
		}
		traverse(node)
		return textContent.String()
	}

	targetTextNormalized := strings.TrimSpace(strings.ReplaceAll(targetText, "\n", " "))
	targetTextNormalized = strings.ReplaceAll(targetTextNormalized, "\r", "")

	var marksToRemove []*html.Node

	for _, markTag := range markTags {
		markText := strings.TrimSpace(extractText(markTag))
		markTextNormalized := strings.ReplaceAll(markText, "\n", " ")
		markTextNormalized = strings.ReplaceAll(markTextNormalized, "\r", "")

		if strings.Contains(targetTextNormalized, markTextNormalized) && markTextNormalized != "" {
			marksToRemove = append(marksToRemove, markTag)
		}
	}

	if len(marksToRemove) == 0 {
		for i := 0; i < len(markTags); i++ {
			var combinedText strings.Builder
			var sequence []*html.Node

			for j := i; j < len(markTags); j++ {
				markText := strings.TrimSpace(extractText(markTags[j]))
				if markText != "" {
					if combinedText.Len() > 0 {
						combinedText.WriteString(" ")
					}
					combinedText.WriteString(markText)
					sequence = append(sequence, markTags[j])

					combinedNormalized := strings.ReplaceAll(combinedText.String(), "\n", " ")
					combinedNormalized = strings.ReplaceAll(combinedNormalized, "\r", "")

					if strings.Contains(combinedNormalized, targetTextNormalized) ||
						strings.Contains(targetTextNormalized, combinedNormalized) {
						marksToRemove = append(marksToRemove, sequence...)
						break
					}
				}
			}
			if len(marksToRemove) > 0 {
				break
			}
		}
	}

	for _, markTag := range marksToRemove {
		textContent := extractText(markTag)
		if textContent != "" {
			textNode := &html.Node{
				Type: html.TextNode,
				Data: textContent,
			}
			if markTag.Parent != nil {
				markTag.Parent.InsertBefore(textNode, markTag)
				markTag.Parent.RemoveChild(markTag)
			}
		} else {
			if markTag.Parent != nil {
				markTag.Parent.RemoveChild(markTag)
			}
		}
	}

	var buf strings.Builder
	html.Render(&buf, doc)
	return buf.String(), nil
}
