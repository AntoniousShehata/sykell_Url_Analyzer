package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

func TestGenerateToken(t *testing.T) {
	t.Run("successful token generation", func(t *testing.T) {
		userID := 1
		username := "testuser"

		token, err := GenerateToken(userID, username)

		assert.NoError(t, err)
		assert.NotEmpty(t, token)

		// Verify token can be parsed
		parsedToken, err := jwt.Parse(token, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		assert.NoError(t, err)
		assert.True(t, parsedToken.Valid)
	})

	t.Run("token contains correct claims", func(t *testing.T) {
		userID := 123
		username := "testuser123"

		token, err := GenerateToken(userID, username)
		assert.NoError(t, err)

		// Parse and validate claims
		parsedToken, err := jwt.ParseWithClaims(token, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		assert.NoError(t, err)
		assert.True(t, parsedToken.Valid)

		claims, ok := parsedToken.Claims.(*Claims)
		assert.True(t, ok)
		assert.Equal(t, userID, claims.UserID)
		assert.Equal(t, username, claims.Username)
		assert.Equal(t, "sykell-analyze", claims.Issuer)
		assert.True(t, claims.ExpiresAt.After(time.Now()))
	})
}

func TestValidateToken(t *testing.T) {
	t.Run("valid token", func(t *testing.T) {
		userID := 1
		username := "testuser"

		token, err := GenerateToken(userID, username)
		assert.NoError(t, err)

		claims, err := ValidateToken(token)
		assert.NoError(t, err)
		assert.NotNil(t, claims)
		assert.Equal(t, userID, claims.UserID)
		assert.Equal(t, username, claims.Username)
	})

	t.Run("invalid token", func(t *testing.T) {
		claims, err := ValidateToken("invalid-token")

		assert.Error(t, err)
		assert.Nil(t, claims)
	})

	t.Run("empty token", func(t *testing.T) {
		claims, err := ValidateToken("")

		assert.Error(t, err)
		assert.Nil(t, claims)
	})

	t.Run("expired token", func(t *testing.T) {
		// Create expired token
		expiredClaims := Claims{
			UserID:   1,
			Username: "testuser",
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
				Issuer:    "sykell-analyze",
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, expiredClaims)
		tokenString, err := token.SignedString(jwtSecret)
		assert.NoError(t, err)

		claims, err := ValidateToken(tokenString)
		assert.Error(t, err)
		assert.Nil(t, claims)
	})

	t.Run("token with wrong signing method", func(t *testing.T) {
		// Create token with wrong signing method
		claims := Claims{
			UserID:   1,
			Username: "testuser",
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
				Issuer:    "sykell-analyze",
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodNone, claims)
		tokenString, err := token.SignedString(jwt.UnsafeAllowNoneSignatureType)
		assert.NoError(t, err)

		validatedClaims, err := ValidateToken(tokenString)
		assert.Error(t, err)
		assert.Nil(t, validatedClaims)
	})
}

func TestAuthMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("successful authentication", func(t *testing.T) {
		// Generate valid token
		userID := 1
		username := "testuser"
		token, err := GenerateToken(userID, username)
		assert.NoError(t, err)

		// Create test request
		req, _ := http.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)

		// Create test context and recorder
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req

		// Call middleware
		middleware := AuthMiddleware()
		middleware(c)

		// Verify success - if not aborted, the middleware passed
		assert.False(t, c.IsAborted())
		assert.Equal(t, userID, c.MustGet("user_id"))
		assert.Equal(t, username, c.MustGet("username"))
	})

	t.Run("missing authorization header", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/protected", nil)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req

		middleware := AuthMiddleware()
		middleware(c)

		assert.True(t, c.IsAborted())
		assert.Equal(t, http.StatusUnauthorized, c.Writer.Status())
	})

	t.Run("invalid authorization header format", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "InvalidFormat")

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req

		middleware := AuthMiddleware()
		middleware(c)

		assert.True(t, c.IsAborted())
		assert.Equal(t, http.StatusUnauthorized, c.Writer.Status())
	})

	t.Run("invalid token", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer invalid-token")

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req

		middleware := AuthMiddleware()
		middleware(c)

		assert.True(t, c.IsAborted())
		assert.Equal(t, http.StatusUnauthorized, c.Writer.Status())
	})

	t.Run("empty token", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer ")

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req

		middleware := AuthMiddleware()
		middleware(c)

		assert.True(t, c.IsAborted())
		assert.Equal(t, http.StatusUnauthorized, c.Writer.Status())
	})

	t.Run("expired token", func(t *testing.T) {
		// Create expired token
		expiredClaims := Claims{
			UserID:   1,
			Username: "testuser",
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
				Issuer:    "sykell-analyze",
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, expiredClaims)
		tokenString, err := token.SignedString(jwtSecret)
		assert.NoError(t, err)

		req, _ := http.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+tokenString)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req

		middleware := AuthMiddleware()
		middleware(c)

		assert.True(t, c.IsAborted())
		assert.Equal(t, http.StatusUnauthorized, c.Writer.Status())
	})

	t.Run("case insensitive bearer", func(t *testing.T) {
		userID := 1
		username := "testuser"
		token, err := GenerateToken(userID, username)
		assert.NoError(t, err)

		req, _ := http.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "bearer "+token)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req

		middleware := AuthMiddleware()
		middleware(c)

		assert.False(t, c.IsAborted())
		assert.Equal(t, userID, c.MustGet("user_id"))
		assert.Equal(t, username, c.MustGet("username"))
	})
}

func TestGetJWTSecret(t *testing.T) {
	t.Run("default secret", func(t *testing.T) {
		secret := getJWTSecret()

		assert.NotEmpty(t, secret)
		assert.Equal(t, "your-secret-key-change-in-production", secret)
	})
}

func TestTokenExpirationTime(t *testing.T) {
	t.Run("token expires in 24 hours", func(t *testing.T) {
		userID := 1
		username := "testuser"

		beforeGeneration := time.Now()
		token, err := GenerateToken(userID, username)
		afterGeneration := time.Now()

		assert.NoError(t, err)

		// Parse token to check expiration
		parsedToken, err := jwt.ParseWithClaims(token, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		assert.NoError(t, err)
		claims, ok := parsedToken.Claims.(*Claims)
		assert.True(t, ok)

		// Check that token expires approximately 24 hours from now
		expectedExpiration := beforeGeneration.Add(24 * time.Hour)
		actualExpiration := claims.ExpiresAt.Time

		// Allow 1 second difference for test execution time
		assert.WithinDuration(t, expectedExpiration, actualExpiration, time.Second)
		assert.True(t, actualExpiration.After(afterGeneration.Add(23*time.Hour+59*time.Minute)))
	})
}

func TestClaimsValidation(t *testing.T) {
	t.Run("valid claims structure", func(t *testing.T) {
		userID := 42
		username := "validuser"

		token, err := GenerateToken(userID, username)
		assert.NoError(t, err)

		claims, err := ValidateToken(token)
		assert.NoError(t, err)

		// Verify all required fields are present
		assert.NotZero(t, claims.UserID)
		assert.NotEmpty(t, claims.Username)
		assert.NotNil(t, claims.ExpiresAt)
		assert.NotNil(t, claims.IssuedAt)
		assert.NotEmpty(t, claims.Issuer)

		// Verify values are correct
		assert.Equal(t, userID, claims.UserID)
		assert.Equal(t, username, claims.Username)
		assert.Equal(t, "sykell-analyze", claims.Issuer)
		assert.True(t, claims.ExpiresAt.After(time.Now()))
		assert.True(t, claims.IssuedAt.Before(time.Now().Add(time.Second)))
	})
}
