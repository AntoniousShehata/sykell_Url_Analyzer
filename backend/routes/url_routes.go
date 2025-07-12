package routes

import (
	"sykell-analyze/backend/handlers"
	"sykell-analyze/backend/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(router *gin.Engine) {
	api := router.Group("/api")
	{
		// Public routes (no authentication required)
		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
		}

		// Protected routes (authentication required)
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			// User profile
			protected.GET("/profile", handlers.GetProfile)
			protected.POST("/auth/refresh", handlers.RefreshToken)

			// URL management endpoints
			protected.POST("/urls", handlers.AddUrl)                    // Add new URL for analysis
			protected.GET("/urls", handlers.GetUrls)                    // Get all URLs with pagination/filtering
			protected.GET("/urls/:id", handlers.GetUrlByID)             // Get specific URL with details
			protected.DELETE("/urls/:id", handlers.DeleteUrl)           // Delete URL
			protected.PUT("/urls/:id/reanalyze", handlers.ReanalyzeUrl) // Reanalyze URL

			// Bulk operations
			protected.DELETE("/urls/bulk", handlers.BulkDelete)           // Delete multiple URLs
			protected.PUT("/urls/bulk/reanalyze", handlers.BulkReanalyze) // Reanalyze multiple URLs

			// Statistics
			protected.GET("/stats", handlers.GetStats) // Get user statistics
		}
	}
}
