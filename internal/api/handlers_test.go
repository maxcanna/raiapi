package api

import (
	"net/http"

	"go.massi.dev/raiapi/internal/middleware"
	"go.massi.dev/raiapi/internal/service"
)

// setupRouter initializes the handlers and middleware similar to internal/api/server.go
func setupRouter() http.Handler {
	svc, _ := service.NewRaiApiService(service.DefaultBaseURL)
	h := NewHandler(svc)
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	// Apply DateValidator middleware to simulate the real app
	return middleware.DateValidator(mux)
}
