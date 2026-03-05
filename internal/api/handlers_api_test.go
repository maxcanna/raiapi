package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"go.massi.dev/raiapi/internal/model"
)

func TestAPIEndpoints(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	router := setupRouter()

	t.Run("GET /api/canali", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/canali", nil)
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rec.Code)
		}

		contentType := rec.Header().Get("Content-Type")
		if !strings.Contains(contentType, "application/json") {
			t.Errorf("Expected application/json, got %s", contentType)
		}

		var canali []model.Canale
		if err := json.Unmarshal(rec.Body.Bytes(), &canali); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		if len(canali) == 0 {
			t.Errorf("Expected canali array, got empty")
		}

		// Ensure the first channel is Rai1 (id 0) as expected by previous tests
		found := false
		for _, c := range canali {
			if c.ID == 0 {
				found = true
				if !strings.Contains(c.Name, "Rai") {
					t.Errorf("Expected 'Rai1' or similar, got %s", c.Name)
				}
				break
			}
		}
		if !found {
			t.Errorf("Did not find channel with ID 0")
		}
	})

	t.Run("GET /api/canali/0/programmi", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/canali/0/programmi", nil)
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("Expected status 200, got %d. Body: %s", rec.Code, rec.Body.String())
		}

		var programmi []model.Programma
		if err := json.Unmarshal(rec.Body.Bytes(), &programmi); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		if len(programmi) == 0 {
			t.Log("No programs found for today, which might be normal")
			return
		}

		p := programmi[0]
		if p.ID < 0 || p.Name == "" {
			t.Errorf("Program mapping looks invalid: %+v", p)
		}
	})

	t.Run("GET /api/canali/0/programmi/0/qualita", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/canali/0/programmi/0/qualita", nil)
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code == http.StatusNotFound {
			t.Log("Program 0 not found, skipping quality check")
			return
		}

		if rec.Code != http.StatusOK {
			t.Fatalf("Expected status 200, got %d. Body: %s", rec.Code, rec.Body.String())
		}

		var qualita []model.Qualita
		if err := json.Unmarshal(rec.Body.Bytes(), &qualita); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		if len(qualita) == 0 {
			t.Errorf("Expected qualita list, got empty")
		}
	})

	t.Run("GET /api/canali/0/programmi/0/qualita/0/url", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/canali/0/programmi/0/qualita/0/url", nil)
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code == http.StatusNotFound {
			t.Log("Program/Quality 0 not found, skipping url check")
			return
		}

		if rec.Code != http.StatusOK {
			t.Fatalf("Expected status 200, got %d. Body: %s", rec.Code, rec.Body.String())
		}

		var resp map[string]string
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		if resp["url"] == "" {
			t.Errorf("Expected url to be present, got empty")
		}
	})

	t.Run("GET /api/canali/0/programmi/0/qualita/0/file", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/canali/0/programmi/0/qualita/0/file", nil)
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code == http.StatusNotFound {
			t.Log("Program/Quality 0 not found, skipping file redirect check")
			return
		}

		if rec.Code != http.StatusFound {
			t.Fatalf("Expected status 302, got %d", rec.Code)
		}

		location := rec.Header().Get("Location")
		if location == "" {
			t.Errorf("Expected Location header in redirect")
		}
	})
}
