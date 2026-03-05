package service

import (
	"context"
	"strings"
	"testing"
	"time"
)

// This test hits the real RaiPlay API.
func TestIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	s, _ := NewRaiApiService(DefaultBaseURL)

	date := time.Now().AddDate(0, 0, -1) // Yesterday
	ctx := context.Background()

	t.Run("listCanali", func(t *testing.T) {
		canali := s.ListCanali(ctx)
		count := 0
		for range canali {
			count++
		}
		if count != 14 {
			t.Errorf("Expected 14 canali, got %d", count)
		}
	})

	t.Run("listProgrammi", func(t *testing.T) {
		programmi := s.ListProgrammi(ctx, 0, date)
		count := 0
		for p, err := range programmi {
			if err != nil {
				t.Fatalf("ListProgrammi failed: %v", err)
			}
			count++
			if p.Name == "" {
				t.Error("Program name is empty")
			}
			if p.ID < 0 {
				t.Error("Program ID is invalid")
			}
		}
		if count == 0 {
			t.Log("No programs found (could be valid)")
		}
	})

	t.Run("listQualita", func(t *testing.T) {
		qualita := s.ListQualita(ctx, 0, date, 0)
		found := false
		count := 0
		for q, err := range qualita {
			if err != nil {
				t.Logf("ListQualita failed (possibly valid if no program 0): %v", err)
				return
			}
			count++
			if strings.HasPrefix(q.Name, "h264 ") {
				found = true
			}
		}
		if count == 0 {
			t.Log("No qualita found")
			return
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
		items := s.GetAll(ctx, 0, date)
		count := 0
		for item := range items {
			count++
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
		if count == 0 {
			t.Log("No items found")
		}
	})
}
