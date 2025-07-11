package main

import (
	"fmt"
	"log"
	"net/http"

	"sykell-analyze/backend/config"

	"github.com/gin-gonic/gin"
)

func main() {
	// Connect to database
	config.ConnectDB()

	// Create a new Gin router
	router := gin.Default()

	// Health check route
	router.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "API is running!",
		})
	})

	// Start the server
	port := "8080"
	fmt.Printf("Server is running on http://localhost:%s\n", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
