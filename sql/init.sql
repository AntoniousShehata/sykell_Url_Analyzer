CREATE TABLE IF NOT EXISTS urls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    url TEXT NOT NULL,
    html_version VARCHAR(50),
    title TEXT,
    h1_count INT DEFAULT 0,
    h2_count INT DEFAULT 0,
    h3_count INT DEFAULT 0,
    internal_links INT DEFAULT 0,
    external_links INT DEFAULT 0,
    broken_links INT DEFAULT 0,
    has_login_form BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
