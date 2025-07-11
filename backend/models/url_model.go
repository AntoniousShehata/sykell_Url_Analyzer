package models

type Url struct {
	ID             int    `json:"id"`
	Url            string `json:"url"`
	HtmlVersion    string `json:"html_version"`
	Title          string `json:"title"`
	H1Count        int    `json:"h1_count"`
	H2Count        int    `json:"h2_count"`
	H3Count        int    `json:"h3_count"`
	InternalLinks  int    `json:"internal_links"`
	ExternalLinks  int    `json:"external_links"`
	BrokenLinks    int    `json:"broken_links"`
	HasLoginForm   bool   `json:"has_login_form"`
	CreatedAt      string `json:"created_at"`
}
