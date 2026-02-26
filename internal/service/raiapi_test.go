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

func TestListCanali(t *testing.T) {
	s, _ := NewRaiApiService("")
	canali := s.ListCanali(context.Background())

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
			_ = json.NewEncoder(w).Encode(resp)
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
			_ = json.NewEncoder(w).Encode(evt)
		} else {
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer ts.Close()

	// Since we cannot override BaseURL (it's constant), we must refactor how we test logic that depends on external calls.
	// For this unit test, we can try to override the Transport if we expose the client, but NewRaiApiService creates it internally.

	// Option: Since the user insisted "DefaultBaseURL is a constant", unit testing against a mock server that needs to intercept
	// requests to "raiplay.it" is hard without modifying the Transport.

	// We will create a custom Transport that redirects requests to our test server.

	s, _ := NewRaiApiService("")

	// Override transport for testing purposes
	// We need to access s.client, but it's unexported.
	// However, we are in the same package `service`.
	s.client.Transport = &rewriteTransport{
		TargetURL: ts.URL,
		Original:  http.DefaultTransport,
	}

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

type rewriteTransport struct {
	TargetURL string
	Original  http.RoundTripper
}

func (t *rewriteTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// Rewrite request URL to target URL
	// We are replacing "https://www.raiplay.it" with our test server URL

	// Simple rewrite: just use TargetURL as host/scheme
	// But TestServer is http, RaiPlay is https

	// Create a new request object to avoid modifying the original if needed
	newReq := req.Clone(req.Context())

	// Parse TargetURL to get scheme and host
	// Actually, just replacing Scheme and Host should be enough if path is correct.
	// Note: ts.URL includes scheme.

	// Let's rely on the fact that our test server URL is short and valid.
	// We just swap the Host and Scheme.

	// But `ts.URL` might be `http://127.0.0.1:56789`.
	// `DefaultBaseURL` is `https://www.raiplay.it`.

	// We need to strip `https://www.raiplay.it` from the request URL and prepend `ts.URL`.
	// But the request URL is fully formed by the service.

	// Since we know the logic, let's just force the request to go to our test server.
	newReq.URL.Scheme = "http"
	newReq.URL.Host = t.TargetURL[7:] // Strip http://

	return t.Original.RoundTrip(newReq)
}

func TestGetVideoUrl(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "HEAD" {
			if r.URL.Path == "/video.mp4" {
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

	// Test direct
	url1, err := s.getVideoUrl(context.Background(), ts.URL + "/video.mp4")
	if err != nil {
		t.Errorf("getVideoUrl failed: %v", err)
	}
	// Note: http.Client follows redirects, but here we just check if it resolves correctly.
	// Since we are mocking, the final URL might be different depending on how httptest handles it.
	// Actually, getVideoUrl makes a HEAD request.
	if url1 != ts.URL+"/video.mp4" {
		t.Errorf("Expected %s, got %s", ts.URL+"/video.mp4", url1)
	}

	// Test unavailable logic: returns original URL
	url3, err := s.getVideoUrl(context.Background(), ts.URL + "/unavailable")
	if err != nil {
		t.Errorf("getVideoUrl failed: %v", err)
	}
	if url3 != ts.URL+"/unavailable" {
		t.Errorf("Expected %s, got %s", ts.URL+"/unavailable", url3)
	}
}
