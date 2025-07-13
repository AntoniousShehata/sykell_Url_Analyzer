# Unit Tests for Sykell URL Analysis Tool

This document describes the comprehensive unit test suite we've created for the project.

## 📋 Test Coverage Overview

### Backend Tests (Go)

**Location:** `backend/`

#### Authentication Handler Tests (`handlers/auth_handler_test.go`)
- ✅ User registration validation
- ✅ Login functionality
- ✅ Password hashing and verification
- ✅ JWT token generation
- ✅ Profile retrieval
- ✅ Input validation (username length, password strength, email format)
- ✅ Error handling for invalid requests

#### URL Handler Tests (`handlers/url_handler_test.go`)
- ✅ URL addition and validation
- ✅ URL retrieval with pagination
- ✅ URL search and filtering
- ✅ Individual URL deletion and reanalysis
- ✅ Bulk operations (delete multiple URLs)
- ✅ Authentication middleware integration
- ✅ Statistics endpoint testing
- ✅ Error handling for invalid parameters

#### Crawler Utility Tests (`utils/crawler_test.go`)
- ✅ HTML parsing and content extraction
- ✅ Header tag counting (H1, H2, H3)
- ✅ Link extraction (internal vs external)
- ✅ Broken link detection
- ✅ Login form detection
- ✅ HTML version identification
- ✅ Timeout handling for slow websites
- ✅ Concurrent link checking
- ✅ Error handling for unreachable URLs
- ✅ User-Agent header verification

#### Authentication Middleware Tests (`middleware/auth_test.go`)
- ✅ JWT token generation and validation
- ✅ Token expiration handling
- ✅ Authorization header processing
- ✅ Claims validation
- ✅ Middleware authentication flow
- ✅ Error handling for invalid/expired tokens

### Frontend Tests (React/TypeScript)

**Location:** `frontend/src/`

#### Component Tests (`components/__tests__/`)

**AuthForm Tests (`AuthForm.test.tsx`)**
- ✅ Login form rendering and functionality
- ✅ Registration form switching
- ✅ Form validation (username length, password strength, email format)
- ✅ Successful authentication handling
- ✅ Error message display
- ✅ Loading states

**UrlForm Tests (`UrlForm.test.tsx`)**
- ✅ Form rendering and input validation
- ✅ URL validation and submission
- ✅ Success and error message handling
- ✅ Loading states during submission
- ✅ Form reset after successful submission

**UrlTable Tests (`UrlTable.test.tsx`)**
- ✅ Data loading and rendering
- ✅ Pagination controls
- ✅ Search functionality
- ✅ Individual URL operations (delete, reanalyze, view details)
- ✅ Bulk selection and operations
- ✅ Status indicators and formatting
- ✅ Error handling and empty states

#### API Tests (`api/__tests__/api.test.ts`)
- ✅ Authentication API calls (login, register, logout)
- ✅ URL management API calls (add, fetch, delete, reanalyze)
- ✅ Bulk operations API calls
- ✅ Authorization header handling
- ✅ Error handling and network failures
- ✅ Token management and localStorage integration

## 🚀 Running the Tests

### Backend Tests (Go)

#### Prerequisites
```bash
cd backend
go mod tidy
```

#### Run All Backend Tests
```bash
# Run all tests
go test ./...

# Run with coverage
go test -cover ./...

# Run with detailed coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Run specific test packages
go test ./handlers
go test ./utils
go test ./middleware

# Run with verbose output
go test -v ./...
```

#### Run Specific Test Files
```bash
# Auth handler tests
go test ./handlers -run TestRegister
go test ./handlers -run TestLogin

# Crawler tests
go test ./utils -run TestCrawlURL
go test ./utils -run TestHTMLParsing

# Middleware tests
go test ./middleware -run TestGenerateToken
go test ./middleware -run TestAuthMiddleware
```

### Frontend Tests (React)

#### Prerequisites
```bash
cd frontend
npm install
```

#### Run All Frontend Tests
```bash
# Run all tests
npm test

# Run in watch mode (continuous testing)
npm test -- --watch

# Run with coverage report
npm test -- --coverage

# Run tests without watch mode (CI environment)
npm test -- --watchAll=false
```

#### Run Specific Test Files
```bash
# Component tests
npm test AuthForm.test.tsx
npm test UrlForm.test.tsx
npm test UrlTable.test.tsx

# API tests
npm test api.test.ts
```

## 📊 Expected Test Results

### Backend Test Summary
- **Total Test Files:** 4
- **Total Test Cases:** 50+
- **Coverage Areas:**
  - Handlers: Authentication, URL management, error handling
  - Utils: Web crawling, HTML parsing, link checking
  - Middleware: JWT authentication, token validation
  - Models: Data validation and structure

### Frontend Test Summary
- **Total Test Files:** 4
- **Total Test Cases:** 40+
- **Coverage Areas:**
  - Components: Forms, tables, authentication flows
  - API: HTTP requests, error handling, token management
  - User Interactions: Form submissions, button clicks, navigation

## 🔧 Test Configuration

### Backend Test Setup
- **Testing Framework:** Go's built-in testing package
- **Assertion Library:** `testify/assert`
- **Mock Framework:** `testify/mock`
- **HTTP Testing:** `httptest` package

### Frontend Test Setup
- **Testing Framework:** Jest
- **Testing Library:** React Testing Library
- **Mock Capabilities:** Jest mocks for API calls and localStorage

## 📈 Continuous Integration

### GitHub Actions (Recommended)
```yaml
name: Tests
on: [push, pull_request]
jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-go@v2
        with:
          go-version: 1.24.5
      - name: Run Backend Tests
        run: |
          cd backend
          go test -v ./...
  
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install Dependencies
        run: |
          cd frontend
          npm install
      - name: Run Frontend Tests
        run: |
          cd frontend
          npm test -- --watchAll=false
```

## 🐛 Debugging Tests

### Backend Debugging
```bash
# Run with race condition detection
go test -race ./...

# Run with verbose output and specific timeout
go test -v -timeout 30s ./...

# Debug specific test
go test -v -run TestCrawlURL ./utils
```

### Frontend Debugging
```bash
# Run in debug mode
npm test -- --verbose

# Run specific test file
npm test -- --testNamePattern="AuthForm"

# Update snapshots if needed
npm test -- --updateSnapshot
```

## 🎯 Test Best Practices Implemented

1. **Isolation:** Each test is independent and doesn't affect others
2. **Mocking:** External dependencies (database, HTTP calls) are properly mocked
3. **Coverage:** Tests cover both happy path and error scenarios
4. **Readability:** Test names clearly describe what is being tested
5. **Maintainability:** Tests are organized and easy to update
6. **Performance:** Tests run quickly and efficiently

## ✅ Quality Assurance

Our test suite ensures:
- **Functional Correctness:** All features work as expected
- **Error Handling:** Proper error messages and graceful failures
- **Security:** Authentication and authorization work correctly
- **Performance:** Timeouts and concurrent operations handled properly
- **User Experience:** UI components behave correctly under all conditions

Run these tests before every commit to ensure code quality and prevent regressions! 