# Sykell URL Analysis Tool

A web application that analyzes websites to extract useful information for SEO and web development. I built this to help analyze website structure, find broken links, and gather technical details about web pages.

## What it does

The tool crawls websites and extracts:
- Page titles and HTML structure (H1, H2, H3 counts)
- Internal and external links
- Broken links with detailed error information
- HTML version and technical details
- Whether the page has login forms

Each user gets their own dashboard to manage their analyzed URLs, with search, filtering, and bulk operations.

## Tech Stack

**Frontend:** React with TypeScript, React Router
**Backend:** Go with Gin framework, JWT authentication
**Database:** MySQL 8.0 with Docker
**Other:** Docker Compose for development

## Getting Started

You'll need Go, Node.js, and Docker installed.

### 1. Clone and Setup
```bash
git clone https://github.com/yourusername/sykell-analyze.git
cd sykell-analyze
```

### 2. Start the Database
```bash
docker-compose up -d mysql
```

### 3. Run the Backend
```bash
cd backend
go mod tidy
go run main.go
```

Backend starts on http://localhost:8080

### 4. Run the Frontend
```bash
cd frontend
npm install
npm start
```

Frontend starts on http://localhost:3000

That's it! Open your browser to http://localhost:3000 to use the app.

## Development Notes

### Database
Uses MySQL with these default credentials:
- Database: `sykell_db`
- User: `sykell_user` 
- Password: `sykell_pass`

The schema gets created automatically when you start the MySQL container.

### API Endpoints
The backend provides these main endpoints:

**Auth:**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login

**URLs:**
- `POST /api/urls` - Add URL for analysis
- `GET /api/urls` - Get your URLs (paginated)
- `GET /api/urls/:id` - Get detailed results
- `DELETE /api/urls/:id` - Delete URL
- `PUT /api/urls/:id/reanalyze` - Re-analyze URL
- `DELETE /api/urls/bulk` - Delete multiple URLs

**Other:**
- `GET /api/health` - Health check
- `GET /api/stats` - User statistics

### How the Analysis Works

When you submit a URL, the backend:
1. Queues it for analysis (status: "queued")
2. Crawls the page in a background goroutine (status: "running")
3. Parses HTML and checks all links
4. Stores results in database (status: "completed" or "error")

The crawler is pretty robust - it handles timeouts, different error types, and uses proper User-Agent headers to avoid being blocked.

## Testing

The project includes comprehensive unit tests for both backend and frontend components.

### Backend Tests (Go)

Run all backend tests:
```bash
cd backend
go test ./...

# Run with coverage
go test -cover ./...

# Run specific test packages
go test ./handlers
go test ./utils
go test ./middleware
```

**Test Coverage:**
- **Authentication:** User registration, login, JWT tokens, password validation
- **URL Handlers:** URL management, pagination, search, bulk operations
- **Crawler:** HTML parsing, link extraction, broken link detection, timeout handling
- **Middleware:** JWT validation, authorization flow

### Frontend Tests (React/TypeScript)

Run all frontend tests:
```bash
cd frontend
npm test

# Run with coverage
npm test -- --coverage

# Run specific component tests
npm test AuthForm.test.tsx
npm test UrlForm.test.tsx
npm test UrlTable.test.tsx
```

**Test Coverage:**
- **Components:** Form validation, user interactions, error handling
- **API:** HTTP requests, authentication, error handling
- **User Flows:** Login, URL submission, data management

### Test Quality Assurance
- All tests are isolated and independent
- External dependencies are properly mocked
- Tests cover both success and error scenarios
- Maintains high code coverage across all modules

## Configuration

### Environment Variables
```bash
PORT=8080                    # Server port
GIN_MODE=release             # Production mode
JWT_SECRET=your-secret-key   # JWT signing key
```

### Frontend API URL
If you need to change the backend URL, edit `API_BASE_URL` in `frontend/src/api/api.ts`.

## Production Deployment

Use the production Docker Compose file:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

Create a `.env` file with your production settings:
```env
MYSQL_ROOT_PASSWORD=your_secure_password
MYSQL_DATABASE=sykell_db
MYSQL_USER=sykell_user
MYSQL_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret
GIN_MODE=release
```


## Database Schema

**users table:**
- Basic user info (id, username, email, password hash, timestamps)

**urls table:**
- URL analysis results (id, user_id, url, title, header counts, link counts, status, timestamps)

**broken_links table:**
- Detailed broken link information (id, url_id, link_url, status_code, error_message)
