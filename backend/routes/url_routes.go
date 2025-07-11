package routes

import (
    "github.com/gin-gonic/gin"
    "sykell-analyze/backend/handlers"
)

func RegisterUrlRoutes(router *gin.Engine) {
    api := router.Group("/api")
    {
        api.POST("/urls", handlers.AddUrl)
        api.GET("/urls", handlers.GetUrls)
    }
}
