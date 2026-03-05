package api

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func TestServerRoutes(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	cfg := Config{
		Port:    3000,
		BaseURL: "https://example.com",
	}

	srv, err := NewServer(cfg, logger)
	if err != nil {
		t.Fatalf("failed to create server: %v", err)
	}

	handler := srv.routes()

	tests := []struct {
		name           string
		method         string
		path           string
		expectedStatus int
	}{
		{"API Canali", http.MethodGet, "/api/canali", http.StatusOK},
		{"Robots.txt", http.MethodGet, "/robots.txt", http.StatusOK},
		{"Home (SPA)", http.MethodGet, "/", http.StatusOK},
		{"Non-existent API", http.MethodGet, "/api/unknown", http.StatusNotFound},
	}

	// Create public/index.html for SPA test
	if err := os.MkdirAll("public", 0755); err != nil {
		t.Fatalf("failed to create public dir: %v", err)
	}
	if err := os.WriteFile("public/index.html", []byte("<html></html>"), 0644); err != nil {
		t.Fatalf("failed to create index.html: %v", err)
	}
	defer os.RemoveAll("public")

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rec.Code)
			}
		})
	}
}
