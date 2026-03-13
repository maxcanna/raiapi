package api

import (
	"encoding/xml"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"go.massi.dev/raiapi/internal/model"
)

func TestRSSEndpoints(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	router := setupRouter()

	t.Run("GET /rss/canali/0.xml", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/rss/canali/0.xml", nil)
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("Expected status 200, got %d. Body: %s", rec.Code, rec.Body.String())
		}

		contentType := rec.Header().Get("Content-Type")
		if !strings.Contains(contentType, "text/xml") {
			t.Errorf("Expected text/xml, got %s", contentType)
		}

		var rss model.RSS
		decoder := xml.NewDecoder(rec.Body)
		decoder.Strict = false // Required for some non-standard character entities often found in CDATA sections.
		if err := decoder.Decode(&rss); err != nil {
			t.Fatalf("Failed to parse RSS XML: %v\nBody: %s", err, rec.Body.String())
		}

		if rss.Version != "2.0" {
			t.Errorf("Expected RSS version 2.0, got %s", rss.Version)
		}

		if rss.Channel.Title == "" {
			t.Errorf("Expected channel title to be populated")
		}

		if len(rss.Channel.Items) == 0 {
			t.Log("No RSS items found, which could be normal if no programs match.")
			return
		}

		// Check the first item
		item := rss.Channel.Items[0]
		if item.Title == "" {
			t.Errorf("Expected item title to be populated")
		}
		if item.Link == "" {
			t.Errorf("Expected item link to be populated")
		}
	})
}
