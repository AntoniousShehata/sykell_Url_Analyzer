package config

import (
	"database/sql"
	"fmt"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func ConnectDB() error {
	dsn := "sykell_user:sykell_pass@tcp(localhost:3306)/sykell_db?parseTime=true"

	var err error
	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("failed to connect to the database: %w", err)
	}

	err = DB.Ping()
	if err != nil {
		return fmt.Errorf("database is unreachable: %w", err)
	}

	fmt.Println("✅ Connected to the database successfully.")
	return nil
}
