package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go.massi.dev/raiapi/internal/model"
)

func TestFetchPage(t *testing.T) {
	// Mock server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/palinsesto/app/rai-1/01-01-2023.json":
			// Return palinsesto
			resp := map[string]interface{}{
				"events": []map[string]interface{}{
					{
						"has_video": true,
						"path_id":   "/programma/123",
					},
					{
						"has_video": false,
						"path_id":   "/programma/456",
					},
				},
			}
			_ = json.NewEncoder(w).Encode(resp)
		case "/programma/123":
			// Return event details
			evt := model.RaiPlayEvent{
				Name:          "Test Program",
				TimePublished: "20:00",
				Weblink:       "/test-program",
				Description:   "Description",
				Video: &struct {
					ContentURL string `json:"content_url"`
				}{
					ContentURL: "http://example.com/video.mp4",
				},
			}
			_ = json.NewEncoder(w).Encode(evt)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer ts.Close()

	s, _ := NewRaiApiService(ts.URL)

	date, _ := time.Parse("2006-01-02", "2023-01-01")
	programmi, err := s.fetchPage(context.Background(), 0, date)
	if err != nil {
		t.Fatalf("fetchPage failed: %v", err)
	}

	if len(programmi) != 1 {
		t.Errorf("Expected 1 program, got %d", len(programmi))
	}

	if programmi[0].Name != "Test Program" {
		t.Errorf("Expected 'Test Program', got '%s'", programmi[0].Name)
	}
}
