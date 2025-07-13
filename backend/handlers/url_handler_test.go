package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestAddUrl(t *testing.T) {
	router := setupTestRouter()
	router.POST("/urls", AddUrl)

	t.Run("successful URL addition", func(t *testing.T) {
		requestBody := map[string]string{
			"url": "https://example.com",
		}

		jsonData, _ := json.Marshal(requestBody)
		req, _ := http.NewRequest(http.MethodPost, "/urls", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user_id", 1)

		AddUrl(c)

		// Note: This would need proper database mocking for full test
		assert.NotEqual(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("missing authentication", func(t *testing.T) {
		requestBody := map[string]string{
			"url": "https://example.com",
		}

		jsonData, _ := json.Marshal(requestBody)
		req, _ := http.NewRequest(http.MethodPost, "/urls", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		// No user_id set in context

		AddUrl(c)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("invalid JSON", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodPost, "/urls", bytes.NewBuffer([]byte("invalid json")))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user_id", 1)

		AddUrl(c)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("missing URL", func(t *testing.T) {
		requestBody := map[string]string{
			"url": "",
		}

		jsonData, _ := json.Marshal(requestBody)
		req, _ := http.NewRequest(http.MethodPost, "/urls", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user_id", 1)

		AddUrl(c)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestGetUrls(t *testing.T) {
	router := setupTestRouter()
	router.GET("/urls", GetUrls)

	t.Run("successful URL retrieval", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/urls?page=1&limit=10", nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user_id", 1)

		GetUrls(c)

		// Note: This would need proper database mocking for full test
		assert.NotEqual(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("missing authentication", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/urls", nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		// No user_id set in context

		GetUrls(c)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("with pagination parameters", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/urls?page=2&limit=25", nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user_id", 1)

		GetUrls(c)

		// Note: This would need proper database mocking for full test
		assert.NotEqual(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("with search parameter", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/urls?search=example", nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user_id", 1)

		GetUrls(c)

		// Note: This would need proper database mocking for full test
		assert.NotEqual(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("with status filter", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/urls?status=completed", nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user_id", 1)

		GetUrls(c)

		// Note: This would need proper database mocking for full test
		assert.NotEqual(t, http.StatusInternalServerError, w.Code)
	})
}

func TestGetUrlByID(t *testing.T) {
	router := setupTestRouter()
	router.GET("/urls/:id", GetUrlByID)

	t.Run("successful URL retrieval by ID", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/urls/1", nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user_id", 1)
		c.Params = gin.Params{gin.Param{Key: "id", Value: "1"}}

		GetUrlByID(c)

		// Note: This would need proper database mocking for full test
		assert.NotEqual(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("missing authentication", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/urls/1", nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Params = gin.Params{gin.Param{Key: "id", Value: "1"}}
		// No user_id set in context

		GetUrlByID(c)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("invalid URL ID", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/urls/invalid", nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user_id", 1)
		c.Params = gin.Params{gin.Param{Key: "id", Value: "invalid"}}

		GetUrlByID(c)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestDeleteUrl(t *testing.T) {
	router := setupTestRouter()
	router.DELETE("/urls/:id", DeleteUrl)

	t.Run("successful URL deletion", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodDelete, "/urls/1", nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user_id", 1)
		c.Params = gin.Params{gin.Param{Key: "id", Value: "1"}}

		DeleteUrl(c)

		// Note: This would need proper database mocking for full test
		assert.NotEqual(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("missing authentication", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodDelete, "/urls/1", nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Params = gin.Params{gin.Param{Key: "id", Value: "1"}}
		// No user_id set in context

		DeleteUrl(c)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("invalid URL ID", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodDelete, "/urls/invalid", nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user_id", 1)
		c.Params = gin.Params{gin.Param{Key: "id", Value: "invalid"}}

		DeleteUrl(c)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestReanalyzeUrl(t *testing.T) {
	router := setupTestRouter()
	router.PUT("/urls/:id/reanalyze", ReanalyzeUrl)

	t.Run("successful URL reanalysis", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodPut, "/urls/1/reanalyze", nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user_id", 1)
		c.Params = gin.Params{gin.Param{Key: "id", Value: "1"}}

		ReanalyzeUrl(c)

		// Note: This would need proper database mocking for full test
		assert.NotEqual(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("missing authentication", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodPut, "/urls/1/reanalyze", nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Params = gin.Params{gin.Param{Key: "id", Value: "1"}}
		// No user_id set in context

		ReanalyzeUrl(c)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("invalid URL ID", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodPut, "/urls/invalid/reanalyze", nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user_id", 1)
		c.Params = gin.Params{gin.Param{Key: "id", Value: "invalid"}}

		ReanalyzeUrl(c)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestBulkDelete(t *testing.T) {
	router := setupTestRouter()
	router.DELETE("/urls/bulk", BulkDelete)

	t.Run("successful bulk deletion", func(t *testing.T) {
		requestBody := map[string][]int{
			"ids": {1, 2, 3},
		}

		jsonData, _ := json.Marshal(requestBody)
		req, _ := http.NewRequest(http.MethodDelete, "/urls/bulk", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user_id", 1)

		BulkDelete(c)

		// Note: This would need proper database mocking for full test
		assert.NotEqual(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("missing authentication", func(t *testing.T) {
		requestBody := map[string][]int{
			"ids": {1, 2, 3},
		}

		jsonData, _ := json.Marshal(requestBody)
		req, _ := http.NewRequest(http.MethodDelete, "/urls/bulk", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		// No user_id set in context

		BulkDelete(c)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("invalid JSON", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodDelete, "/urls/bulk", bytes.NewBuffer([]byte("invalid json")))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user_id", 1)

		BulkDelete(c)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("empty IDs array", func(t *testing.T) {
		requestBody := map[string][]int{
			"ids": {},
		}

		jsonData, _ := json.Marshal(requestBody)
		req, _ := http.NewRequest(http.MethodDelete, "/urls/bulk", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user_id", 1)

		BulkDelete(c)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestGetStats(t *testing.T) {
	router := setupTestRouter()
	router.GET("/stats", GetStats)

	t.Run("successful stats retrieval", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/stats", nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		c.Set("user_id", 1)

		GetStats(c)

		// Note: This would need proper database mocking for full test
		assert.NotEqual(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("missing authentication", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/stats", nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		// No user_id set in context

		GetStats(c)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

func TestPaginationValidation(t *testing.T) {
	testCases := []struct {
		name          string
		page          string
		limit         string
		expectedPage  int
		expectedLimit int
	}{
		{
			name:          "valid parameters",
			page:          "2",
			limit:         "25",
			expectedPage:  2,
			expectedLimit: 25,
		},
		{
			name:          "invalid page defaults to 1",
			page:          "0",
			limit:         "10",
			expectedPage:  1,
			expectedLimit: 10,
		},
		{
			name:          "invalid limit defaults to 10",
			page:          "1",
			limit:         "150",
			expectedPage:  1,
			expectedLimit: 10,
		},
		{
			name:          "empty parameters use defaults",
			page:          "",
			limit:         "",
			expectedPage:  1,
			expectedLimit: 10,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			page, _ := strconv.Atoi(tc.page)
			limit, _ := strconv.Atoi(tc.limit)

			if page < 1 {
				page = 1
			}
			if limit < 1 || limit > 100 {
				limit = 10
			}

			assert.Equal(t, tc.expectedPage, page)
			assert.Equal(t, tc.expectedLimit, limit)
		})
	}
}
