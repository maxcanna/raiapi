package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"testing"
	"time"

	"go.massi.dev/raiapi/internal/model"
)

func TestListCanali(t *testing.T) {
	s, _ := NewRaiApiService(DefaultBaseURL)
	canaliIter := s.ListCanali(context.Background())
	canali := slices.Collect(canaliIter)

	if len(canali) != 14 {
		t.Errorf("Expected 14 canali, got %d", len(canali))
	}

	if canali[0].Name != "Rai1" {
		t.Errorf("Expected Rai1, got %s", canali[0].Name)
	}
}

func TestProgramAndQualityHandling(t *testing.T) {
	// Mock server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/palinsesto/app/rai-1/01-01-2023.json":
			// Return palinsesto with one video program and one non-video program
			resp := map[string]any{
				"events": []map[string]any{
					{
						"has_video": true,
						"path_id":   "/programma/video",
					},
					{
						"has_video": false,
						"path_id":   "/programma/no-video",
					},
				},
			}
			_ = json.NewEncoder(w).Encode(resp)
		case "/programma/video":
			evt := model.RaiPlayEvent{
				Name:          "Video Program",
				TimePublished: "20:00",
				Weblink:       "/video-program",
				Description:   "Description",
				Video: &model.RaiPlayVideo{
					ContentURL: "http://example.com/video.mp4",
				},
			}
			_ = json.NewEncoder(w).Encode(evt)
		case "/programma/no-video":
			evt := model.RaiPlayEvent{
				Name:          "No Video Program",
				TimePublished: "21:00",
				Weblink:       "/no-video-program",
				Description:   "", // Empty description to test omitempty
				// Video is nil
			}
			_ = json.NewEncoder(w).Encode(evt)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer ts.Close()

	s, _ := NewRaiApiService(ts.URL)
	date, _ := time.Parse("2006-01-02", "2023-01-01")
	ctx := context.Background()

	// 1. Verify fetchPage returns both programs in correct order
	programmi, err := s.fetchPage(ctx, 0, date)
	if err != nil {
		t.Fatalf("fetchPage failed: %v", err)
	}
	if len(programmi) != 2 {
		t.Errorf("Expected 2 programs, got %d", len(programmi))
	}
	if programmi[0].Name != "Video Program" || programmi[1].Name != "No Video Program" {
		t.Errorf("Unexpected order or content: 0=%s, 1=%s", programmi[0].Name, programmi[1].Name)
	}

	// 2. Verify ListProgrammi output (JSON should not have omitempty)
	iter := s.ListProgrammi(ctx, 0, date)
	var list []model.Programma
	for p, err := range iter {
		if err != nil {
			t.Fatalf("ListProgrammi iteration failed: %v", err)
		}
		list = append(list, p)
	}

	if len(list) != 2 {
		t.Errorf("Expected 2 programs in list, got %d", len(list))
	}

	// Check the non-video program (index 1)
	noVideoProg := list[1]
	if noVideoProg.Name != "No Video Program" {
		t.Errorf("Expected index 1 to be No Video Program, got %s", noVideoProg.Name)
	}

	// Check JSON encoding for omitempty
	jsonData, _ := json.Marshal(noVideoProg)
	var decoded map[string]any
	_ = json.Unmarshal(jsonData, &decoded)

	if _, ok := decoded["description"]; !ok {
		t.Error("JSON key 'description' missing (omitempty still active?)")
	}
	if _, ok := decoded["image"]; !ok {
		t.Error("JSON key 'image' missing (omitempty still active?)")
	}

	// 3. Verify ListQualita for non-video program (should return 404/error, matching original JS behavior)
	qIter := s.ListQualita(ctx, 0, date, 1)
	qCount := 0
	foundError := false
	for _, err := range qIter {
		if err != nil && err.Error() == "dati non disponibili" {
			foundError = true
		}
		qCount++
	}
	if !foundError {
		t.Error("Expected 404 error (dati non disponibili) for no-video program, but got none")
	}
	if qCount != 1 { // It yields an error once
		t.Errorf("Expected 1 yield (the error), got %d", qCount)
	}
}
