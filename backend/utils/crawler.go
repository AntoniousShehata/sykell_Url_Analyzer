package utils

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

type CrawlResult struct {
	HtmlVersion   string
	Title         string
	H1            int
	H2            int
	H3            int
	InternalLinks int
	ExternalLinks int
	BrokenLinks   int
	HasLoginForm  bool
}

// CrawlURL downloads and analyses a web page, returning structured data.
func CrawlURL(target string) (*CrawlResult, error) {
	res, err := http.Get(target)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		return nil, err
	}

	// HTML version: look at <!doctype …>
	htmlVer := "HTML5" // default

	title := strings.TrimSpace(doc.Find("title").First().Text())
	base, _ := url.Parse(target)

	var h1, h2, h3, internal, external, broken int
	doc.Find("h1").Each(func(_ int, _ *goquery.Selection) { h1++ })
	doc.Find("h2").Each(func(_ int, _ *goquery.Selection) { h2++ })
	doc.Find("h3").Each(func(_ int, _ *goquery.Selection) { h3++ })

	// Link stats
	doc.Find("a[href]").Each(func(_ int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		link, err := url.Parse(href)
		if err != nil || href == "" {
			return
		}
		if link.Host == "" || link.Host == base.Host {
			internal++
		} else {
			external++
		}

		// quick broken‑link check (HEAD)
		resp, err := http.Head(link.String())
		if err != nil || resp.StatusCode >= 400 {
			broken++
		}
	})

	// login form?
	hasLogin := doc.Find(`form input[type="password"]`).Length() > 0

	return &CrawlResult{
		HtmlVersion:   htmlVer,
		Title:         title,
		H1:            h1,
		H2:            h2,
		H3:            h3,
		InternalLinks: internal,
		ExternalLinks: external,
		BrokenLinks:   broken,
		HasLoginForm:  hasLogin,
	}, nil
}
