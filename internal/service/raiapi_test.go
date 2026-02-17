package service

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go.massi.dev/raiapi/internal/model"
)

func TestListCanali(t *testing.T) {
	s, _ := NewRaiApiService("")
	canali := s.ListCanali()

	if len(canali) != 14 {
		t.Errorf("Expected 14 canali, got %d", len(canali))
	}

	if canali[0].Name != "Rai1" {
		t.Errorf("Expected Rai1, got %s", canali[0].Name)
	}
}

func TestFetchPage(t *testing.T) {
	// Mock server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/palinsesto/app/rai-1/01-01-2023.json" {
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
			json.NewEncoder(w).Encode(resp)
		} else if r.URL.Path == "/programma/123" {
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
			json.NewEncoder(w).Encode(evt)
		} else {
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer ts.Close()

	s, _ := NewRaiApiService("")
	s.BaseURL = ts.URL

	date, _ := time.Parse("2006-01-02", "2023-01-01")
	programmi, err := s.fetchPage(0, date)
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

func TestGetVideoUrl(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "HEAD" {
			if r.URL.Path == "/video.mp4" {
				// Redirect or just return 200 with same URL
				w.WriteHeader(http.StatusOK)
			} else if r.URL.Path == "/redirect" {
				http.Redirect(w, r, "/video.mp4", http.StatusFound)
			} else if r.URL.Path == "/unavailable" {
				http.Redirect(w, r, "/video_no_available.mp4", http.StatusFound)
			}
		}
	}))
	defer ts.Close()

	s, _ := NewRaiApiService("")
	// We don't set BaseURL here because GetVideoUrl takes a full URL

	// Test direct
	url1, err := s.getVideoUrl(ts.URL + "/video.mp4")
	if err != nil {
		t.Errorf("getVideoUrl failed: %v", err)
	}
	if url1 != ts.URL+"/video.mp4" {
		t.Errorf("Expected %s, got %s", ts.URL+"/video.mp4", url1)
	}

	// Test redirect
	// Note: http.Client follows redirects by default.
	// So resp.Request.URL should be the final URL.
	url2, err := s.getVideoUrl(ts.URL + "/redirect")
	if err != nil {
		t.Errorf("getVideoUrl failed: %v", err)
	}
	// It should resolve to /video.mp4
	// Wait, httptest server URLs might change or handle redirects internally?
	// If I redirect to /video.mp4, client will follow.
	// The final URL will be ts.URL + "/video.mp4"
	if url2 != ts.URL+"/video.mp4" {
		t.Errorf("Expected %s, got %s", ts.URL+"/video.mp4", url2)
	}

	// Test unavailable
	url3, err := s.getVideoUrl(ts.URL + "/unavailable")
	if err != nil {
		t.Errorf("getVideoUrl failed: %v", err)
	}
	// Should return original URL if video_no_available.mp4
	if url3 != ts.URL+"/unavailable" {
		t.Errorf("Expected %s, got %s", ts.URL+"/unavailable", url3)
	}
}
