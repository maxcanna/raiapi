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
		slog.DebugContext(ctx, "failed to get channel identifier", "idCanale", idCanale, "error", err)
		return nil, err
	}

	targetURL := fmt.Sprintf("%s/palinsesto/app/%s/%s.json", s.baseURL, canaleIdentifier, date.Format("02-01-2006"))
	slog.DebugContext(ctx, "fetching daily palinsesto page", "url", targetURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		slog.DebugContext(ctx, "failed to create request for palinsesto page", "url", targetURL, "error", err)
		return nil, err
	}
	req.Header.Set("User-Agent", UserAgent)

	resp, err := s.client.Do(req)
	if err != nil {
		slog.DebugContext(ctx, "failed to execute request for palinsesto page", "url", targetURL, "error", err)
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
		slog.DebugContext(ctx, "unexpected status code for palinsesto page", "url", targetURL, "statusCode", resp.StatusCode)
		return []model.RaiPlayEvent{}, nil
	}

	var body struct {
		Events []struct {
			HasVideo bool   `json:"has_video"`
			PathID   string `json:"path_id"`
		} `json:"events"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		slog.DebugContext(ctx, "failed to decode palinsesto page JSON", "url", targetURL, "error", err)
		return nil, err
	}

	var fetchURLs []string
	for i, evt := range body.Events {
		if evt.PathID != "" {
			fetchURLs = append(fetchURLs, s.baseURL+evt.PathID)
		} else {
			slog.DebugContext(ctx, "skipping event without PathID", "eventIndex", i)
		}
	}

	if len(fetchURLs) == 0 {
		slog.DebugContext(ctx, "no event URLs to fetch", "url", targetURL)
		return []model.RaiPlayEvent{}, nil
	}
	slog.DebugContext(ctx, "found events to fetch", "count", len(fetchURLs))

	// Fetch details concurrently
	g, groupCtx := errgroup.WithContext(ctx)
	g.SetLimit(10) // Limit concurrency

	results := make([]model.RaiPlayEvent, len(fetchURLs))

	for i, u := range fetchURLs {
		g.Go(func() error {
			slog.DebugContext(groupCtx, "fetching event details", "url", u)
			req, err := http.NewRequestWithContext(groupCtx, http.MethodGet, u, nil)
			if err != nil {
				slog.DebugContext(groupCtx, "failed to create request for event detail", "url", u, "error", err)
				return nil
			}
			req.Header.Set("User-Agent", UserAgent)
			resp, err := s.client.Do(req)
			if err != nil {
				slog.DebugContext(groupCtx, "failed to fetch event detail", "url", u, "error", err)
				return nil // Skip on individual error
			}
			defer func() {
				if _, err := io.Copy(io.Discard, resp.Body); err != nil {
					slog.DebugContext(groupCtx, "failed to drain response body", "error", err)
				}
				if err := resp.Body.Close(); err != nil {
					slog.DebugContext(groupCtx, "failed to close response body", "error", err)
				}
			}()

			if resp.StatusCode == http.StatusOK {
				var event model.RaiPlayEvent
				if err := json.NewDecoder(resp.Body).Decode(&event); err == nil {
					results[i] = event
				} else {
					slog.DebugContext(groupCtx, "failed to decode event detail", "url", u, "error", err)
				}
			} else {
				slog.DebugContext(groupCtx, "unexpected status code for event detail", "url", u, "statusCode", resp.StatusCode)
			}
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		slog.ErrorContext(ctx, "wait error in fetchPage", "error", err)
	}

	var programmi []model.RaiPlayEvent
	for i, p := range results {
		if p.Name != "" { // Filter out failed fetches (empty structs)
			programmi = append(programmi, p)
		} else {
			slog.DebugContext(ctx, "skipping event with empty name (likely fetch/decode failure)", "index", i, "url", fetchURLs[i])
		}
	}
	slog.DebugContext(ctx, "completed fetching events", "successful_count", len(programmi), "total_count", len(fetchURLs))

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
		slog.DebugContext(ctx, "cache disabled, fetching directly", "idCanale", idCanale, "date", date)
		return s.fetchPage(ctx, idCanale, date)
	}

	docIndex, err := s.getDocumentIndexForDate(idCanale, date)
	if err != nil {
		slog.DebugContext(ctx, "failed to compute doc index, falling back to fetch", "error", err)
		return s.fetchPage(ctx, idCanale, date)
	}

	programs, err := s.cache.Get(ctx, docIndex)
	if errors.Is(err, mongo.ErrNoDocuments) {
		slog.DebugContext(ctx, "data not found in cache, fetching", "docIndex", docIndex)
		return s.fetchPage(ctx, idCanale, date)
	} else if err != nil {
		slog.ErrorContext(ctx, "error reading from cache, falling back to fetch", "error", err)
		return s.fetchPage(ctx, idCanale, date)
	}

	slog.DebugContext(ctx, "returning data from cache", "docIndex", docIndex)
	return programs, nil
}
