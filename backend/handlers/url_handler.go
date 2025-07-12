package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"sykell-analyze/backend/config"
	"sykell-analyze/backend/models"
	"sykell-analyze/backend/utils"

	"github.com/gin-gonic/gin"
)

// AddUrl handles adding a new URL for analysis
func AddUrl(c *gin.Context) {
	var input struct {
		URL string `json:"url" binding:"required"`
	}

	// Get authenticated user
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		return
	}

	// Bind JSON request to struct
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Validate URL format
	if input.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "URL is required",
		})
		return
	}

	// Check if URL already exists for this user
	var existingID int
	err := config.DB.QueryRow("SELECT id FROM urls WHERE url = ? AND user_id = ?", input.URL, userID).Scan(&existingID)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "URL already exists for this user",
			"id":    existingID,
		})
		return
	} else if err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Database error",
		})
		return
	}

	// Insert URL with queued status
	query := `
		INSERT INTO urls (
			user_id, url, status, created_at, updated_at
		) VALUES (?, ?, 'queued', ?, ?)
	`

	now := time.Now()
	result, err := config.DB.Exec(query, userID, input.URL, now, now)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to save URL",
			"details": err.Error(),
		})
		return
	}

	// Get the inserted ID
	id, _ := result.LastInsertId()

	// Start crawling in background
	go func() {
		crawlAndUpdateURL(int(id), input.URL)
	}()

	// Create response object
	urlData := models.Url{
		ID:        int(id),
		UserID:    userID.(int),
		Url:       input.URL,
		Status:    "queued",
		CreatedAt: now,
		UpdatedAt: now,
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "URL queued for analysis",
		"data":    urlData,
	})
}

// crawlAndUpdateURL performs the actual crawling and updates the database
func crawlAndUpdateURL(urlID int, url string) {
	// Update status to running
	config.DB.Exec("UPDATE urls SET status = 'running', updated_at = ? WHERE id = ?", time.Now(), urlID)

	// Crawl and analyze the URL
	crawlResult, err := utils.CrawlURL(url)
	if err != nil {
		// Update status to error
		config.DB.Exec(
			"UPDATE urls SET status = 'error', error_message = ?, updated_at = ? WHERE id = ?",
			err.Error(), time.Now(), urlID,
		)
		return
	}

	// Update with analysis results
	query := `
		UPDATE urls SET 
			html_version = ?, title = ?, h1_count = ?, h2_count = ?, h3_count = ?,
			internal_links = ?, external_links = ?, broken_links = ?, has_login_form = ?,
			status = 'completed', updated_at = ?
		WHERE id = ?
	`

	config.DB.Exec(query,
		crawlResult.HtmlVersion,
		crawlResult.Title,
		crawlResult.H1,
		crawlResult.H2,
		crawlResult.H3,
		crawlResult.InternalLinks,
		crawlResult.ExternalLinks,
		len(crawlResult.BrokenLinksDetails),
		crawlResult.HasLoginForm,
		time.Now(),
		urlID,
	)

	// Store broken links details
	for _, brokenLink := range crawlResult.BrokenLinksDetails {
		config.DB.Exec(
			"INSERT INTO broken_links (url_id, link_url, status_code, error_message, created_at) VALUES (?, ?, ?, ?, ?)",
			urlID, brokenLink.URL, brokenLink.StatusCode, brokenLink.Error, time.Now(),
		)
	}
}

// GetUrls retrieves all analyzed URLs for the authenticated user
func GetUrls(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		return
	}

	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	status := c.Query("status")
	search := c.Query("search")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit

	// Build query with filters
	baseQuery := `
		SELECT id, user_id, url, html_version, title, h1_count, h2_count, h3_count,
		       internal_links, external_links, broken_links, has_login_form, 
		       status, error_message, created_at, updated_at
		FROM urls 
		WHERE user_id = ?
	`

	countQuery := "SELECT COUNT(*) FROM urls WHERE user_id = ?"
	args := []interface{}{userID}
	countArgs := []interface{}{userID}

	if status != "" {
		baseQuery += " AND status = ?"
		countQuery += " AND status = ?"
		args = append(args, status)
		countArgs = append(countArgs, status)
	}

	if search != "" {
		baseQuery += " AND (title LIKE ? OR url LIKE ?)"
		countQuery += " AND (title LIKE ? OR url LIKE ?)"
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern, searchPattern)
		countArgs = append(countArgs, searchPattern, searchPattern)
	}

	baseQuery += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	// Get total count
	var total int
	err := config.DB.QueryRow(countQuery, countArgs...).Scan(&total)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Database error",
		})
		return
	}

	// Get URLs
	rows, err := config.DB.Query(baseQuery, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Database query failed",
			"details": err.Error(),
		})
		return
	}
	defer rows.Close()

	var urls []models.Url
	for rows.Next() {
		var u models.Url
		err := rows.Scan(
			&u.ID, &u.UserID, &u.Url, &u.HtmlVersion, &u.Title,
			&u.H1Count, &u.H2Count, &u.H3Count,
			&u.InternalLinks, &u.ExternalLinks, &u.BrokenLinks,
			&u.HasLoginForm, &u.Status, &u.ErrorMessage,
			&u.CreatedAt, &u.UpdatedAt,
		)
		if err != nil {
			continue // skip bad rows
		}
		urls = append(urls, u)
	}

	if err = rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error reading results",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": urls,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + limit - 1) / limit,
		},
	})
}

// GetUrlByID retrieves a specific URL by ID with broken links details
func GetUrlByID(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		return
	}

	id := c.Param("id")

	var url models.Url
	err := config.DB.QueryRow(`
		SELECT id, user_id, url, html_version, title, h1_count, h2_count, h3_count,
		       internal_links, external_links, broken_links, has_login_form, 
		       status, error_message, created_at, updated_at
		FROM urls WHERE id = ? AND user_id = ?
	`, id, userID).Scan(
		&url.ID, &url.UserID, &url.Url, &url.HtmlVersion, &url.Title,
		&url.H1Count, &url.H2Count, &url.H3Count,
		&url.InternalLinks, &url.ExternalLinks, &url.BrokenLinks,
		&url.HasLoginForm, &url.Status, &url.ErrorMessage,
		&url.CreatedAt, &url.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "URL not found",
		})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Database error",
			"details": err.Error(),
		})
		return
	}

	// Get broken links details
	brokenLinksRows, err := config.DB.Query(`
		SELECT id, url_id, link_url, status_code, error_message, created_at
		FROM broken_links WHERE url_id = ?
		ORDER BY created_at DESC
	`, url.ID)

	var brokenLinks []models.BrokenLink
	if err == nil {
		defer brokenLinksRows.Close()
		for brokenLinksRows.Next() {
			var bl models.BrokenLink
			err := brokenLinksRows.Scan(
				&bl.ID, &bl.UrlID, &bl.LinkUrl, &bl.StatusCode, &bl.ErrorMessage, &bl.CreatedAt,
			)
			if err == nil {
				brokenLinks = append(brokenLinks, bl)
			}
		}
	}

	result := models.UrlWithBrokenLinks{
		Url:                url,
		BrokenLinksDetails: brokenLinks,
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}

// DeleteUrl deletes a URL by ID (only if owned by user)
func DeleteUrl(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		return
	}

	id := c.Param("id")

	result, err := config.DB.Exec("DELETE FROM urls WHERE id = ? AND user_id = ?", id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete URL",
			"details": err.Error(),
		})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "URL not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "URL deleted successfully",
	})
}

// ReanalyzeUrl reanalyzes a URL by ID (only if owned by user)
func ReanalyzeUrl(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		return
	}

	id := c.Param("id")

	// Get the URL first and verify ownership
	var url string
	err := config.DB.QueryRow("SELECT url FROM urls WHERE id = ? AND user_id = ?", id, userID).Scan(&url)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "URL not found",
		})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Database error",
			"details": err.Error(),
		})
		return
	}

	// Reset status to queued
	_, err = config.DB.Exec(
		"UPDATE urls SET status = 'queued', error_message = NULL, updated_at = ? WHERE id = ?",
		time.Now(), id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to queue URL for reanalysis",
		})
		return
	}

	// Clear existing broken links
	config.DB.Exec("DELETE FROM broken_links WHERE url_id = ?", id)

	// Start crawling in background
	go func() {
		urlID, _ := strconv.Atoi(id)
		crawlAndUpdateURL(urlID, url)
	}()

	c.JSON(http.StatusOK, gin.H{
		"message": "URL queued for reanalysis",
		"id":      id,
	})
}

// BulkDelete deletes multiple URLs by IDs
func BulkDelete(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		return
	}

	var req struct {
		IDs []int `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	if len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No IDs provided",
		})
		return
	}

	// Build query with placeholders
	query := "DELETE FROM urls WHERE user_id = ? AND id IN ("
	args := []interface{}{userID}

	for i, id := range req.IDs {
		if i > 0 {
			query += ","
		}
		query += "?"
		args = append(args, id)
	}
	query += ")"

	result, err := config.DB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete URLs",
		})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	c.JSON(http.StatusOK, gin.H{
		"message":       "URLs deleted successfully",
		"deleted_count": rowsAffected,
	})
}

// BulkReanalyze reanalyzes multiple URLs by IDs
func BulkReanalyze(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		return
	}

	var req struct {
		IDs []int `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	if len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No IDs provided",
		})
		return
	}

	// Get URLs and verify ownership
	query := "SELECT id, url FROM urls WHERE user_id = ? AND id IN ("
	args := []interface{}{userID}

	for i, id := range req.IDs {
		if i > 0 {
			query += ","
		}
		query += "?"
		args = append(args, id)
	}
	query += ")"

	rows, err := config.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Database error",
		})
		return
	}
	defer rows.Close()

	var urlsToReanalyze []struct {
		ID  int
		URL string
	}

	for rows.Next() {
		var item struct {
			ID  int
			URL string
		}
		if err := rows.Scan(&item.ID, &item.URL); err == nil {
			urlsToReanalyze = append(urlsToReanalyze, item)
		}
	}

	// Reset status to queued for all URLs
	for _, item := range urlsToReanalyze {
		config.DB.Exec(
			"UPDATE urls SET status = 'queued', error_message = NULL, updated_at = ? WHERE id = ?",
			time.Now(), item.ID,
		)
		config.DB.Exec("DELETE FROM broken_links WHERE url_id = ?", item.ID)

		// Start crawling in background
		go func(id int, url string) {
			crawlAndUpdateURL(id, url)
		}(item.ID, item.URL)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "URLs queued for reanalysis",
		"queued_count": len(urlsToReanalyze),
	})
}

// GetStats returns statistics for the authenticated user
func GetStats(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		return
	}

	var stats models.UrlStats

	// Get URL counts by status
	rows, err := config.DB.Query(`
		SELECT status, COUNT(*) 
		FROM urls 
		WHERE user_id = ? 
		GROUP BY status
	`, userID)

	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var status string
			var count int
			if err := rows.Scan(&status, &count); err == nil {
				switch status {
				case "queued":
					stats.QueuedUrls = count
				case "running":
					stats.RunningUrls = count
				case "completed":
					stats.CompletedUrls = count
				case "error":
					stats.ErrorUrls = count
				}
				stats.TotalUrls += count
			}
		}
	}

	// Get total broken links
	config.DB.QueryRow(`
		SELECT COALESCE(SUM(broken_links), 0)
		FROM urls 
		WHERE user_id = ? AND status = 'completed'
	`, userID).Scan(&stats.TotalBrokenLinks)

	c.JSON(http.StatusOK, gin.H{
		"data": stats,
	})
}
