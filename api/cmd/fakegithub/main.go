// Command fakegithub serves the fake GitHub OAuth endpoints for the e2e stack.
package main

import (
	"log"
	"net/http"
	"os"

	"devserver/api/internal/fakegithub"
)

func main() {
	addr := os.Getenv("ADDR")
	if addr == "" {
		addr = ":9180"
	}
	log.Printf("fake github listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, fakegithub.New()))
}
