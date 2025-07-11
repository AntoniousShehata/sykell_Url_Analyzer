package handlers

import (
	"net/http"

	"sykell-analyze/backend/config"
	"sykell-analyze/backend/models"

	"github.com/gin-gonic/gin"
)

func AddUrl(c *gin.Context) {
	var input models.Url

	// Bind JSON request to struct
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
		return
	}

	// Insert URL into database
	query := `INSERT INTO urls (url) VALUES (?)`
	result, err := config.DB.Exec(query, input.Url)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save URL"})
		return
	}

	// Get the inserted ID
	id, _ := result.LastInsertId()
	input.ID = int(id)

	c.JSON(http.StatusCreated, gin.H{
		"message": "URL saved successfully",
		"data":    input,
	})
}

func GetUrls(c *gin.Context) {
	rows, err := config.DB.Query("SELECT * FROM urls ORDER BY created_at DESC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database query failed"})
		return
	}
	defer rows.Close()

	var urls []models.Url
	for rows.Next() {
		var u models.Url
		err := rows.Scan(&u.ID, &u.Url, &u.HtmlVersion, &u.Title,
			&u.H1Count, &u.H2Count, &u.H3Count,
			&u.InternalLinks, &u.ExternalLinks, &u.BrokenLinks,
			&u.HasLoginForm, &u.CreatedAt)
		if err != nil {
			continue // skip bad rows
		}
		urls = append(urls, u)
	}

	c.JSON(http.StatusOK, urls)
}
