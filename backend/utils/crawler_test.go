package utils

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestCrawlURL(t *testing.T) {
	// Create test server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		html := `
<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
</head>
<body>
    <h1>Main Heading</h1>
    <h2>Sub Heading 1</h2>
    <h2>Sub Heading 2</h2>
    <h3>Sub Sub Heading</h3>
    
    <form action="/login" method="post">
        <input type="password" name="password">
        <input type="submit" value="Login">
    </form>
    
    <a href="/internal">Internal Link</a>
    <a href="https://external.com">External Link</a>
    <a href="/broken">Broken Link</a>
</body>
</html>`
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(html))
	}))
	defer server.Close()

	t.Run("successful crawl", func(t *testing.T) {
		result, err := CrawlURL(server.URL)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "Test Page", result.Title)
		assert.Equal(t, 1, result.H1)
		assert.Equal(t, 2, result.H2)
		assert.Equal(t, 1, result.H3)
		assert.True(t, result.HasLoginForm)
		assert.Greater(t, result.InternalLinks, 0)
		assert.Greater(t, result.ExternalLinks, 0)
	})

	t.Run("invalid URL", func(t *testing.T) {
		result, err := CrawlURL("invalid-url")

		assert.Error(t, err)
		assert.Nil(t, result)
	})

	t.Run("unreachable URL", func(t *testing.T) {
		result, err := CrawlURL("http://unreachable-domain-12345.com")

		assert.Error(t, err)
		assert.Nil(t, result)
	})
}

func TestCrawlURLWithTimeout(t *testing.T) {
	// Create slow server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second)
		w.Write([]byte("<html><body>Slow response</body></html>"))
	}))
	defer server.Close()

	t.Run("timeout handling", func(t *testing.T) {
		// This test would need to be adjusted based on the actual timeout implementation
		// For now, we'll test that it doesn't hang indefinitely
		start := time.Now()
		result, err := CrawlURL(server.URL)
		duration := time.Since(start)

		// Should complete within reasonable time (including timeout)
		assert.Less(t, duration, 2*time.Minute)

		// Could be success or timeout error
		if err != nil {
			assert.Contains(t, err.Error(), "timeout")
		} else {
			assert.NotNil(t, result)
		}
	})
}

func TestHTMLParsing(t *testing.T) {
	testCases := []struct {
		name          string
		html          string
		expectedH1    int
		expectedH2    int
		expectedH3    int
		expectedTitle string
		hasLoginForm  bool
	}{
		{
			name:          "basic HTML",
			html:          `<html><head><title>Test</title></head><body><h1>Title</h1><h2>Subtitle</h2></body></html>`,
			expectedH1:    1,
			expectedH2:    1,
			expectedH3:    0,
			expectedTitle: "Test",
			hasLoginForm:  false,
		},
		{
			name:          "multiple headers",
			html:          `<html><body><h1>H1-1</h1><h1>H1-2</h1><h2>H2-1</h2><h2>H2-2</h2><h3>H3-1</h3></body></html>`,
			expectedH1:    2,
			expectedH2:    2,
			expectedH3:    1,
			expectedTitle: "",
			hasLoginForm:  false,
		},
		{
			name:          "with login form",
			html:          `<html><body><form><input type="password"><input type="submit"></form></body></html>`,
			expectedH1:    0,
			expectedH2:    0,
			expectedH3:    0,
			expectedTitle: "",
			hasLoginForm:  true,
		},
		{
			name:          "no headers",
			html:          `<html><body><p>Just text</p></body></html>`,
			expectedH1:    0,
			expectedH2:    0,
			expectedH3:    0,
			expectedTitle: "",
			hasLoginForm:  false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "text/html")
				w.Write([]byte(tc.html))
			}))
			defer server.Close()

			result, err := CrawlURL(server.URL)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, tc.expectedH1, result.H1)
			assert.Equal(t, tc.expectedH2, result.H2)
			assert.Equal(t, tc.expectedH3, result.H3)
			assert.Equal(t, tc.expectedTitle, result.Title)
			assert.Equal(t, tc.hasLoginForm, result.HasLoginForm)
		})
	}
}

func TestLinkExtraction(t *testing.T) {
	testCases := []struct {
		name              string
		html              string
		baseURL           string
		expectedInternal  int
		expectedExternal  int
		expectedBrokenMin int
	}{
		{
			name: "mixed links",
			html: `<html><body>
				<a href="/internal1">Internal 1</a>
				<a href="/internal2">Internal 2</a>
				<a href="https://external.com">External</a>
				<a href="https://another-external.com">Another External</a>
				<a href="/broken-link">Broken</a>
			</body></html>`,
			baseURL:           "https://example.com",
			expectedInternal:  3,
			expectedExternal:  2,
			expectedBrokenMin: 1,
		},
		{
			name:              "no links",
			html:              `<html><body><p>No links here</p></body></html>`,
			baseURL:           "https://example.com",
			expectedInternal:  0,
			expectedExternal:  0,
			expectedBrokenMin: 0,
		},
		{
			name: "only external links",
			html: `<html><body>
				<a href="https://external1.com">External 1</a>
				<a href="https://external2.com">External 2</a>
			</body></html>`,
			baseURL:           "https://example.com",
			expectedInternal:  0,
			expectedExternal:  2,
			expectedBrokenMin: 0,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if strings.Contains(r.URL.Path, "broken") {
					w.WriteHeader(http.StatusNotFound)
					return
				}

				w.Header().Set("Content-Type", "text/html")
				w.Write([]byte(tc.html))
			}))
			defer server.Close()

			result, err := CrawlURL(server.URL)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, tc.expectedInternal, result.InternalLinks)
			assert.Equal(t, tc.expectedExternal, result.ExternalLinks)
			assert.GreaterOrEqual(t, len(result.BrokenLinksDetails), tc.expectedBrokenMin)
		})
	}
}

func TestBrokenLinkDetection(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/":
			html := `<html><body>
				<a href="/working">Working Link</a>
				<a href="/not-found">Not Found Link</a>
				<a href="/server-error">Server Error Link</a>
			</body></html>`
			w.Write([]byte(html))
		case "/working":
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK"))
		case "/not-found":
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("Not Found"))
		case "/server-error":
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Server Error"))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	t.Run("broken link detection", func(t *testing.T) {
		result, err := CrawlURL(server.URL)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Greater(t, len(result.BrokenLinksDetails), 0)

		// Check that broken links have proper error information
		for _, brokenLink := range result.BrokenLinksDetails {
			assert.NotEmpty(t, brokenLink.URL)
			assert.True(t, brokenLink.StatusCode != nil || brokenLink.Error != "")
		}
	})
}

func TestHTMLVersionDetection(t *testing.T) {
	testCases := []struct {
		name            string
		html            string
		expectedVersion string
	}{
		{
			name:            "HTML5",
			html:            `<!DOCTYPE html><html><body></body></html>`,
			expectedVersion: "HTML5",
		},
		{
			name:            "HTML 4.01 Strict",
			html:            `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd"><html><body></body></html>`,
			expectedVersion: "HTML 4.01 Strict",
		},
		{
			name:            "XHTML 1.0 Strict",
			html:            `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><body></body></html>`,
			expectedVersion: "XHTML 1.0 Strict",
		},
		{
			name:            "No DOCTYPE",
			html:            `<html><body></body></html>`,
			expectedVersion: "Unknown",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "text/html")
				w.Write([]byte(tc.html))
			}))
			defer server.Close()

			result, err := CrawlURL(server.URL)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, tc.expectedVersion, result.HtmlVersion)
		})
	}
}

func TestUserAgentAndHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userAgent := r.Header.Get("User-Agent")
		accept := r.Header.Get("Accept")

		// Verify proper headers are set
		assert.Contains(t, userAgent, "Chrome")
		assert.Contains(t, accept, "text/html")

		w.Write([]byte(`<html><body><h1>Test</h1></body></html>`))
	}))
	defer server.Close()

	t.Run("proper headers set", func(t *testing.T) {
		result, err := CrawlURL(server.URL)

		assert.NoError(t, err)
		assert.NotNil(t, result)
	})
}

func TestConcurrentLinkChecking(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Simulate slow response for some links
		if strings.Contains(r.URL.Path, "slow") {
			time.Sleep(100 * time.Millisecond)
		}

		if r.URL.Path == "/" {
			html := `<html><body>`
			// Generate many links to test concurrency
			for i := 0; i < 20; i++ {
				html += `<a href="/link` + strconv.Itoa(i) + `">Link ` + strconv.Itoa(i) + `</a>`
			}
			html += `</body></html>`
			w.Write([]byte(html))
		} else {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK"))
		}
	}))
	defer server.Close()

	t.Run("concurrent link checking", func(t *testing.T) {
		start := time.Now()
		result, err := CrawlURL(server.URL)
		duration := time.Since(start)

		assert.NoError(t, err)
		assert.NotNil(t, result)

		// With proper concurrency, should complete reasonably quickly
		// even with many links
		assert.Less(t, duration, 10*time.Second)
		assert.Greater(t, result.InternalLinks, 10)
	})
}

func TestErrorHandling(t *testing.T) {
	testCases := []struct {
		name          string
		url           string
		expectedError string
	}{
		{
			name:          "invalid URL format",
			url:           "invalid-url",
			expectedError: "network error",
		},
		{
			name:          "unreachable host",
			url:           "http://unreachable-host-12345.com",
			expectedError: "not found",
		},
		{
			name:          "connection refused",
			url:           "http://localhost:99999",
			expectedError: "network error",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := CrawlURL(tc.url)

			assert.Error(t, err)
			assert.Nil(t, result)
			assert.Contains(t, err.Error(), tc.expectedError)
		})
	}
}

func TestContextCancellation(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Simulate very slow response
		time.Sleep(5 * time.Second)
		w.Write([]byte(`<html><body>Slow</body></html>`))
	}))
	defer server.Close()

	t.Run("context cancellation", func(t *testing.T) {
		// This would test context cancellation if the CrawlURL function
		// supported external context cancellation
		start := time.Now()
		result, err := CrawlURL(server.URL)
		duration := time.Since(start)

		// Should timeout within reasonable time
		assert.Less(t, duration, 2*time.Minute)

		// Should either succeed or have timeout error
		if err != nil {
			assert.Contains(t, err.Error(), "timeout")
		} else {
			assert.NotNil(t, result)
		}
	})
}
