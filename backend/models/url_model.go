package models

import "time"

type Url struct {
	ID            int       `json:"id"`
	UserID        int       `json:"user_id"`
	Url           string    `json:"url"`
	HtmlVersion   string    `json:"html_version"`
	Title         string    `json:"title"`
	H1Count       int       `json:"h1_count"`
	H2Count       int       `json:"h2_count"`
	H3Count       int       `json:"h3_count"`
	InternalLinks int       `json:"internal_links"`
	ExternalLinks int       `json:"external_links"`
	BrokenLinks   int       `json:"broken_links"`
	HasLoginForm  bool      `json:"has_login_form"`
	Status        string    `json:"status"`
	ErrorMessage  *string   `json:"error_message,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type BrokenLink struct {
	ID           int       `json:"id"`
	UrlID        int       `json:"url_id"`
	LinkUrl      string    `json:"link_url"`
	StatusCode   *int      `json:"status_code,omitempty"`
	ErrorMessage *string   `json:"error_message,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type UrlWithBrokenLinks struct {
	Url
	BrokenLinksDetails []BrokenLink `json:"broken_links_details"`
}

type UrlStats struct {
	TotalUrls        int `json:"total_urls"`
	QueuedUrls       int `json:"queued_urls"`
	RunningUrls      int `json:"running_urls"`
	CompletedUrls    int `json:"completed_urls"`
	ErrorUrls        int `json:"error_urls"`
	TotalBrokenLinks int `json:"total_broken_links"`
}
