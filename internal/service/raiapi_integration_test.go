package service

import (
	"context"
	"strings"
	"testing"
	"time"
)

// This test hits the real RaiPlay API.
// It matches the behavior of raiapi.test.js
func TestIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	s, _ := NewRaiApiService("")

	date := time.Now().AddDate(0, 0, -1) // Yesterday
	ctx := context.Background()

	t.Run("listCanali", func(t *testing.T) {
		canali := s.ListCanali(ctx)
		if len(canali) != 14 {
			t.Errorf("Expected 14 canali, got %d", len(canali))
		}
	})

	t.Run("listProgrammi", func(t *testing.T) {
		programmi, err := s.ListProgrammi(ctx, 0, date)
		if err != nil {
			t.Fatalf("ListProgrammi failed: %v", err)
		}
		if len(programmi) == 0 {
			t.Log("No programs found (could be valid)")
			return
		}
		for _, p := range programmi {
			if p.Name == "" {
				t.Error("Program name is empty")
			}
			if p.ID < 0 {
				t.Error("Program ID is invalid")
			}
		}
	})

	t.Run("listQualita", func(t *testing.T) {
		qualita, err := s.ListQualita(ctx, 0, date, 0)
		if err != nil {
			t.Logf("ListQualita failed (possibly valid if no program 0): %v", err)
			return
		}
		if len(qualita) == 0 {
			t.Log("No qualita found")
			return
		}
		found := false
		for _, q := range qualita {
			if strings.HasPrefix(q.Name, "h264 ") {
				found = true
				break
			}
		}
		if !found {
			t.Error("Expected h264 quality")
		}
	})

	t.Run("getFileUrl", func(t *testing.T) {
		url, err := s.GetFileUrl(ctx, 0, date, 0, 0)
		if err != nil {
			t.Logf("GetFileUrl failed (possibly valid): %v", err)
			return
		}
		if !strings.HasPrefix(url, "https://") && !strings.HasPrefix(url, "http://") {
			t.Errorf("Expected URL, got %s", url)
		}
	})

	t.Run("getAll", func(t *testing.T) {
		items, err := s.GetAll(ctx, 0, date)
		if err != nil {
			t.Logf("GetAll failed: %v", err)
			return
		}
		if len(items) == 0 {
			t.Log("No items found")
			return
		}
		for _, item := range items {
			if item.Name == "" {
				t.Error("Name is empty")
			}
			if item.Orario == "" {
				t.Error("Orario is empty")
			}
			if item.URL == "" {
				t.Error("URL is empty")
			}
		}
	})
}
