package utils

import (
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

type BrokenLinkDetail struct {
	URL        string
	StatusCode *int
	Error      string
}

type CrawlResult struct {
	HtmlVersion        string
	Title              string
	H1                 int
	H2                 int
	H3                 int
	InternalLinks      int
	ExternalLinks      int
	BrokenLinksDetails []BrokenLinkDetail
	HasLoginForm       bool
}

// CrawlURL downloads and analyses a web page, returning structured data.
func CrawlURL(target string) (*CrawlResult, error) {
	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Create request with proper User-Agent header
	req, err := http.NewRequest("GET", target, nil)
	if err != nil {
		return nil, err
	}

	// Set User-Agent to appear as a regular browser
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")
	req.Header.Set("Accept-Encoding", "gzip, deflate")
	req.Header.Set("Connection", "keep-alive")
	req.Header.Set("Upgrade-Insecure-Requests", "1")

	res, err := client.Do(req)
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

	var h1, h2, h3, internal, external int
	var brokenLinks []BrokenLinkDetail

	doc.Find("h1").Each(func(_ int, _ *goquery.Selection) { h1++ })
	doc.Find("h2").Each(func(_ int, _ *goquery.Selection) { h2++ })
	doc.Find("h3").Each(func(_ int, _ *goquery.Selection) { h3++ })

	// Link stats
	doc.Find("a[href]").Each(func(_ int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		if href == "" {
			return
		}

		// Resolve relative URLs
		link, err := url.Parse(href)
		if err != nil {
			return
		}

		// Make absolute URL
		absoluteURL := base.ResolveReference(link)

		// Skip non-HTTP links (mailto, tel, etc.)
		if absoluteURL.Scheme != "http" && absoluteURL.Scheme != "https" {
			return
		}

		// Classify as internal or external
		if absoluteURL.Host == base.Host {
			internal++
		} else {
			external++
		}

		// Check if link is broken (with timeout)
		go func(linkURL string) {
			checkClient := &http.Client{
				Timeout: 10 * time.Second,
			}

			// Create HEAD request with proper headers
			req, err := http.NewRequest("HEAD", linkURL, nil)
			if err != nil {
				brokenLinks = append(brokenLinks, BrokenLinkDetail{
					URL:   linkURL,
					Error: err.Error(),
				})
				return
			}

			// Set User-Agent for broken link checks too
			req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

			resp, err := checkClient.Do(req)
			if err != nil {
				brokenLinks = append(brokenLinks, BrokenLinkDetail{
					URL:   linkURL,
					Error: err.Error(),
				})
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode >= 400 {
				brokenLinks = append(brokenLinks, BrokenLinkDetail{
					URL:        linkURL,
					StatusCode: &resp.StatusCode,
					Error:      resp.Status,
				})
			}
		}(absoluteURL.String())
	})

	// Wait a bit for broken link checks to complete
	time.Sleep(2 * time.Second)

	// login form?
	hasLogin := doc.Find(`form input[type="password"]`).Length() > 0

	return &CrawlResult{
		HtmlVersion:        htmlVer,
		Title:              title,
		H1:                 h1,
		H2:                 h2,
		H3:                 h3,
		InternalLinks:      internal,
		ExternalLinks:      external,
		BrokenLinksDetails: brokenLinks,
		HasLoginForm:       hasLogin,
	}, nil
}
