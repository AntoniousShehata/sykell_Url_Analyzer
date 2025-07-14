package main

import (
	"fmt"
	"log"
	"sykell-analyze/backend/utils"
)

func testWiki() {
	// Test with the specific Wikipedia URL
	testURL := "https://en.wikipedia.org/wiki/Steve_Wozniak"
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

	// Let's also test a simpler URL to compare
	fmt.Println("\n=== Testing with httpbin.org ===")
	testURL2 := "https://httpbin.org/html"
	fmt.Printf("Testing URL: %s\n", testURL2)

	result2, err := utils.CrawlURL(testURL2)
	if err != nil {
		log.Printf("Crawler Error: %v\n", err)
		return
	}

	fmt.Printf("Title: '%s'\n", result2.Title)
	fmt.Printf("HTML Version: %s\n", result2.HtmlVersion)
	fmt.Printf("H1 Count: %d\n", result2.H1)
	fmt.Printf("H2 Count: %d\n", result2.H2)
	fmt.Printf("H3 Count: %d\n", result2.H3)
	fmt.Printf("Internal Links: %d\n", result2.InternalLinks)
	fmt.Printf("External Links: %d\n", result2.ExternalLinks)
	fmt.Printf("Broken Links: %d\n", len(result2.BrokenLinksDetails))
	fmt.Printf("Has Login Form: %t\n", result2.HasLoginForm)
}
