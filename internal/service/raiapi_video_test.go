package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGetVideoUrl(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "HEAD" {
			switch r.URL.Path {
			case "/video.mp4":
				w.WriteHeader(http.StatusOK)
			case "/redirect":
				http.Redirect(w, r, "/video.mp4", http.StatusFound)
			case "/unavailable":
				http.Redirect(w, r, "/video_no_available.mp4", http.StatusFound)
			}
		}
	}))
	defer ts.Close()

	s, _ := NewRaiApiService(DefaultBaseURL)
	ctx := context.Background()

	// Test direct
	url1, err := s.getVideoUrl(ctx, ts.URL+"/video.mp4")
	if err != nil {
		t.Errorf("getVideoUrl failed: %v", err)
	}
	if url1 != ts.URL+"/video.mp4" {
		t.Errorf("Expected %s, got %s", ts.URL+"/video.mp4", url1)
	}

	// Test unavailable logic: returns original URL
	url3, err := s.getVideoUrl(ctx, ts.URL+"/unavailable")
	if err != nil {
		t.Errorf("getVideoUrl failed: %v", err)
	}
	if url3 != ts.URL+"/unavailable" {
		t.Errorf("Expected %s, got %s", ts.URL+"/unavailable", url3)
	}
}
