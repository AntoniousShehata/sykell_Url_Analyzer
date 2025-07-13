package models

type Stats struct {
	TotalUrls        int            `json:"total_urls"`
	StatusCounts     map[string]int `json:"status_counts"`
	TotalBrokenLinks int            `json:"total_broken_links"`
}
