package utils

import (
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
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
	// Create context with timeout for the entire operation
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	// Create HTTP client with extended timeout for slow websites
	client := &http.Client{
		Timeout: 60 * time.Second,
	}

	// Create request with proper User-Agent header
	req, err := http.NewRequestWithContext(ctx, "GET", target, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	// Set User-Agent to appear as a regular browser
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")
	req.Header.Set("Accept-Encoding", "gzip, deflate")
	req.Header.Set("Connection", "keep-alive")
	req.Header.Set("Upgrade-Insecure-Requests", "1")

	res, err := client.Do(req)
	if err != nil {
		// Provide more informative error messages
		if strings.Contains(err.Error(), "context deadline exceeded") {
			return nil, fmt.Errorf("website timeout: %s took too long to respond (>60s)", target)
		}
		if strings.Contains(err.Error(), "no such host") {
			return nil, fmt.Errorf("website not found: %s does not exist", target)
		}
		if strings.Contains(err.Error(), "connection refused") {
			return nil, fmt.Errorf("connection refused: %s is not accepting connections", target)
		}
		if strings.Contains(err.Error(), "certificate") {
			return nil, fmt.Errorf("SSL certificate error: %s has invalid certificate", target)
		}
		return nil, fmt.Errorf("network error: %v", err)
	}
	defer res.Body.Close()

	// Check if the response is successful
	if res.StatusCode >= 400 {
		return nil, fmt.Errorf("website error: %s returned %d %s", target, res.StatusCode, res.Status)
	}

	// Handle GZIP decompression manually
	var reader io.Reader = res.Body
	if res.Header.Get("Content-Encoding") == "gzip" {
		gzipReader, err := gzip.NewReader(res.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to create gzip reader: %v", err)
		}
		defer gzipReader.Close()
		reader = gzipReader
	}

	doc, err := goquery.NewDocumentFromReader(reader)
	if err != nil {
		return nil, fmt.Errorf("parsing error: failed to parse HTML from %s: %v", target, err)
	}

	// HTML version: look at <!doctype …>
	htmlVer := "HTML5" // default

	title := strings.TrimSpace(doc.Find("title").First().Text())

	base, err := url.Parse(target)
	if err != nil {
		return nil, fmt.Errorf("failed to parse base URL: %v", err)
	}

	var h1, h2, h3, internal, external int

	// Count headings
	doc.Find("h1").Each(func(_ int, _ *goquery.Selection) { h1++ })
	doc.Find("h2").Each(func(_ int, _ *goquery.Selection) { h2++ })
	doc.Find("h3").Each(func(_ int, _ *goquery.Selection) { h3++ })

	// Collect all links for processing
	var linksToCheck []string
	var brokenLinks []BrokenLinkDetail

	// Process links and collect them for broken link checking
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

		// Add to links to check for broken status
		linksToCheck = append(linksToCheck, absoluteURL.String())
	})

	// Check broken links with proper concurrency control
	if len(linksToCheck) > 0 {
		brokenLinks = checkBrokenLinks(ctx, linksToCheck)
	}

	// Check for login form
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

// checkBrokenLinks checks multiple links concurrently with proper synchronization
func checkBrokenLinks(ctx context.Context, links []string) []BrokenLinkDetail {
	var brokenLinks []BrokenLinkDetail
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Limit concurrent requests to avoid overwhelming servers
	maxConcurrent := 10
	if len(links) < maxConcurrent {
		maxConcurrent = len(links)
	}

	semaphore := make(chan struct{}, maxConcurrent)

	for _, linkURL := range links {
		// Check if context is cancelled
		select {
		case <-ctx.Done():
			return brokenLinks
		default:
		}

		wg.Add(1)
		go func(url string) {
			defer wg.Done()

			// Acquire semaphore
			select {
			case semaphore <- struct{}{}:
			case <-ctx.Done():
				return
			}
			defer func() { <-semaphore }()

			// Check the link
			if brokenDetail := checkSingleLink(ctx, url); brokenDetail != nil {
				mu.Lock()
				brokenLinks = append(brokenLinks, *brokenDetail)
				mu.Unlock()
			}
		}(linkURL)
	}

	// Wait for all goroutines to complete or timeout
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		// All checks completed
	case <-time.After(30 * time.Second):
		// Timeout waiting for broken link checks
		fmt.Printf("Warning: Some broken link checks timed out\n")
	case <-ctx.Done():
		// Context cancelled
		fmt.Printf("Warning: Broken link checks cancelled\n")
	}

	return brokenLinks
}

// checkSingleLink checks if a single link is broken
func checkSingleLink(ctx context.Context, linkURL string) *BrokenLinkDetail {
	// Create client with shorter timeout for link checks
	client := &http.Client{
		Timeout: 15 * time.Second,
	}

	// Create HEAD request with context
	req, err := http.NewRequestWithContext(ctx, "HEAD", linkURL, nil)
	if err != nil {
		return &BrokenLinkDetail{
			URL:   linkURL,
			Error: fmt.Sprintf("Request creation failed: %v", err),
		}
	}

	// Set User-Agent for broken link checks
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "*/*")

	resp, err := client.Do(req)
	if err != nil {
		// Skip context cancellation errors
		if ctx.Err() != nil {
			return nil
		}

		errorMsg := err.Error()
		if strings.Contains(errorMsg, "context deadline exceeded") {
			errorMsg = "Link check timeout"
		} else if strings.Contains(errorMsg, "no such host") {
			errorMsg = "Host not found"
		} else if strings.Contains(errorMsg, "connection refused") {
			errorMsg = "Connection refused"
		}

		return &BrokenLinkDetail{
			URL:   linkURL,
			Error: errorMsg,
		}
	}
	defer resp.Body.Close()

	// Consider 4xx and 5xx as broken links
	if resp.StatusCode >= 400 {
		return &BrokenLinkDetail{
			URL:        linkURL,
			StatusCode: &resp.StatusCode,
			Error:      resp.Status,
		}
	}

	// Link is working
	return nil
}
