package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"golang.org/x/sync/errgroup"

	"go.massi.dev/raiapi/internal/model"
)

func (s *RaiApiService) fetchPage(ctx context.Context, idCanale int, date time.Time) ([]model.RaiPlayEvent, error) {
	canaleIdentifier, err := s.getChannelIdentifier(idCanale)
	if err != nil {
		return nil, err
	}

	targetURL := fmt.Sprintf("%s/palinsesto/app/%s/%s.json", s.baseURL, canaleIdentifier, date.Format("02-01-2006"))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", UserAgent)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() {
		if _, err := io.Copy(io.Discard, resp.Body); err != nil {
			slog.WarnContext(ctx, "failed to drain response body", "error", err)
		}
		if err := resp.Body.Close(); err != nil {
			slog.WarnContext(ctx, "failed to close response body", "error", err)
		}
	}()

	if resp.StatusCode != http.StatusOK {
		return []model.RaiPlayEvent{}, nil
	}

	var body struct {
		Events []struct {
			HasVideo bool   `json:"has_video"`
			PathID   string `json:"path_id"`
		} `json:"events"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, err
	}

	var fetchURLs []string
	for _, evt := range body.Events {
		if evt.HasVideo {
			fetchURLs = append(fetchURLs, s.baseURL+evt.PathID)
		}
	}

	if len(fetchURLs) == 0 {
		return []model.RaiPlayEvent{}, nil
	}

	// Fetch details concurrently
	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(10) // Limit concurrency

	results := make(chan model.RaiPlayEvent, len(fetchURLs))

	for _, u := range fetchURLs {
		g.Go(func() error {
			req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
			if err != nil {
				return nil
			}
			req.Header.Set("User-Agent", UserAgent)
			resp, err := s.client.Do(req)
			if err != nil {
				slog.DebugContext(ctx, "failed to fetch event detail", "url", u, "error", err)
				return nil // Skip on individual error
			}
			defer func() {
				if _, err := io.Copy(io.Discard, resp.Body); err != nil {
					slog.DebugContext(ctx, "failed to drain response body", "error", err)
				}
				if err := resp.Body.Close(); err != nil {
					slog.DebugContext(ctx, "failed to close response body", "error", err)
				}
			}()

			if resp.StatusCode == http.StatusOK {
				var event model.RaiPlayEvent
				if err := json.NewDecoder(resp.Body).Decode(&event); err == nil {
					select {
					case results <- event:
					case <-ctx.Done():
						return ctx.Err()
					}
				} else {
					slog.DebugContext(ctx, "failed to decode event detail", "url", u, "error", err)
				}
			}
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		slog.ErrorContext(ctx, "wait error in fetchPage", "error", err)
	}
	close(results)

	var programmi []model.RaiPlayEvent
	for p := range results {
		programmi = append(programmi, p)
	}

	// Cache programs
	if s.cache != nil {
		docIndex, _ := s.getDocumentIndexForDate(idCanale, date)
		if err := s.cache.Set(ctx, docIndex, programmi); err != nil {
			slog.ErrorContext(ctx, "failed to update cache", "error", err)
		}
	}

	return programmi, nil
}

func (s *RaiApiService) getData(ctx context.Context, idCanale int, date time.Time) ([]model.RaiPlayEvent, error) {
	if s.cache == nil {
		return s.fetchPage(ctx, idCanale, date)
	}

	docIndex, err := s.getDocumentIndexForDate(idCanale, date)
	if err != nil {
		return nil, err
	}

	programs, err := s.cache.Get(ctx, docIndex)
	if err != nil {
		if !errors.Is(err, mongo.ErrNoDocuments) {
			slog.ErrorContext(ctx, "error reading from cache", "error", err)
		}
		return s.fetchPage(ctx, idCanale, date)
	}

	return programs, nil
}
