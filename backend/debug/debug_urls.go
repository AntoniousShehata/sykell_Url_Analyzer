package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"sykell-analyze/backend/config"
	"sykell-analyze/backend/utils"

	_ "github.com/go-sql-driver/mysql"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run . <debug_function>")
		fmt.Println("Available functions:")
		fmt.Println("  urls    - Test database URLs and crawler")
		fmt.Println("  simple  - Simple crawler test with httpbin.org")
		fmt.Println("  wiki    - Test crawler with Wikipedia URL")
		return
	}

	switch os.Args[1] {
	case "urls":
		debugURLs()
	case "simple":
		simpleDebug()
	case "wiki":
		testWiki()
	default:
		fmt.Printf("Unknown function: %s\n", os.Args[1])
		fmt.Println("Available functions: urls, simple, wiki")
	}
}

func debugURLs() {
	// Connect to database
	if err := config.ConnectDB(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Check URLs in database
	fmt.Println("=== URLs in Database ===")
	rows, err := config.DB.Query("SELECT id, url, title, status, error_message, internal_links, external_links FROM urls ORDER BY id DESC LIMIT 5")
	if err != nil {
		log.Fatalf("Failed to query database: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var id int
		var url, status string
		var title, errorMessage sql.NullString
		var internalLinks, externalLinks int

		err := rows.Scan(&id, &url, &title, &status, &errorMessage, &internalLinks, &externalLinks)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		fmt.Printf("ID: %d\n", id)
		fmt.Printf("URL: %s\n", url)
		if title.Valid {
			fmt.Printf("Title: %s\n", title.String)
		} else {
			fmt.Printf("Title: (null)\n")
		}
		fmt.Printf("Status: %s\n", status)
		fmt.Printf("Internal Links: %d\n", internalLinks)
		fmt.Printf("External Links: %d\n", externalLinks)
		if errorMessage.Valid {
			fmt.Printf("Error: %s\n", errorMessage.String)
		}
		fmt.Println("---")
	}

	// Test crawler directly with simple site first
	fmt.Println("\n=== Testing Crawler with example.com ===")
	testURL := "https://example.com"
	fmt.Printf("Testing URL: %s\n", testURL)

	result, err := utils.CrawlURL(testURL)
	if err != nil {
		log.Printf("Crawler Error: %v\n", err)
	} else {
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

	// Test crawler with problematic site
	fmt.Println("\n=== Testing Crawler with arabicbible.com ===")
	testURL2 := "https://www.arabicbible.com"
	fmt.Printf("Testing URL: %s\n", testURL2)

	result2, err := utils.CrawlURL(testURL2)
	if err != nil {
		log.Printf("Crawler Error: %v\n", err)
		fmt.Println("Skipping detailed output for problematic URL")
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
