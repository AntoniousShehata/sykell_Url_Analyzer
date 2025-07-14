package main

import (
	"fmt"
	"log"
	"sykell-analyze/backend/utils"
)

func simpleDebug() {
	// Test with httpbin.org which returns predictable HTML
	testURL := "https://httpbin.org/html"
	fmt.Printf("Testing URL: %s\n", testURL)

	result, err := utils.CrawlURL(testURL)
	if err != nil {
		log.Printf("Crawler Error: %v\n", err)
		return
	}

	fmt.Printf("Title: '%s'\n", result.Title)
	fmt.Printf("HTML Version: %s\n", result.HtmlVersion)
	fmt.Printf("H1 Count: %d\n", result.H1)
	fmt.Printf("H2 Count: %d\n", result.H2)
	fmt.Printf("H3 Count: %d\n", result.H3)
	fmt.Printf("Internal Links: %d\n", result.InternalLinks)
	fmt.Printf("External Links: %d\n", result.ExternalLinks)
	fmt.Printf("Broken Links: %d\n", len(result.BrokenLinksDetails))
	fmt.Printf("Has Login Form: %t\n", result.HasLoginForm)
}
