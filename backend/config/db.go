package config

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func ConnectDB() {
	dsn := "sykell_user:sykell_pass@tcp(localhost:3306)/sykell_db?parseTime=true"

	var err error
	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Failed to connect to the database:", err)
	}

	err = DB.Ping()
	if err != nil {
		log.Fatal("Database is unreachable:", err)
	}

	fmt.Println("Connected to the database successfully.")
}
