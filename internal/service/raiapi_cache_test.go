package service

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go.massi.dev/raiapi/internal/model"
)

type MockCache struct {
	data map[string][]model.RaiPlayEvent
	GetFunc func(ctx context.Context, key string) ([]model.RaiPlayEvent, error)
	SetFunc func(ctx context.Context, key string, programs []model.RaiPlayEvent) error
}

func (m *MockCache) Get(ctx context.Context, key string) ([]model.RaiPlayEvent, error) {
	if m.GetFunc != nil {
		return m.GetFunc(ctx, key)
	}
	d, ok := m.data[key]
	if !ok {
		return nil, errors.New("not found") // Simulating mongo.ErrNoDocuments could be done here
	}
	return d, nil
}

func (m *MockCache) Set(ctx context.Context, key string, programs []model.RaiPlayEvent) error {
	if m.SetFunc != nil {
		return m.SetFunc(ctx, key, programs)
	}
	m.data[key] = programs
	return nil
}

func TestCacheLogic(t *testing.T) {
	// Mock RaiPlay server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := map[string]interface{}{
			"events": []map[string]interface{}{
				{"has_video": true, "path_id": "/event1"},
			},
		}
		if r.URL.Path == "/event1" {
			_ = json.NewEncoder(w).Encode(model.RaiPlayEvent{Name: "From Server"})
			return
		}
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer ts.Close()

	ctx := context.Background()
	date := time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)
	key := "rai-1:2023:01:01"

	t.Run("Cache Hit", func(t *testing.T) {
		mock := &MockCache{
			data: map[string][]model.RaiPlayEvent{
				key: {{Name: "From Cache"}},
			},
		}
		s := &RaiApiService{
			client:  http.DefaultClient,
			cache:   mock,
			baseURL: ts.URL,
		}

		data, err := s.getData(ctx, 0, date)
		if err != nil {
			t.Fatalf("getData failed: %v", err)
		}

		if len(data) != 1 || data[0].Name != "From Cache" {
			t.Errorf("Expected data from cache, got %+v", data)
		}
	})

	t.Run("Cache Miss", func(t *testing.T) {
		mock := &MockCache{
			data: make(map[string][]model.RaiPlayEvent),
			GetFunc: func(ctx context.Context, key string) ([]model.RaiPlayEvent, error) {
				// Simulating mongo.ErrNoDocuments which is what our code checks for
				// (using a generic error for now as we checked for it in raiapi_fetch.go)
				return nil, errors.New("mongo: no documents in result") 
			},
		}
		s := &RaiApiService{
			client:  http.DefaultClient,
			cache:   mock,
			baseURL: ts.URL,
		}

		data, err := s.getData(ctx, 0, date)
		if err != nil {
			t.Fatalf("getData failed: %v", err)
		}

		if len(data) != 1 || data[0].Name != "From Server" {
			t.Errorf("Expected data from server, got %+v", data)
		}

		// Verify it was saved to cache
		if mock.data[key][0].Name != "From Server" {
			t.Error("Expected data to be saved to cache after miss")
		}
	})
}
