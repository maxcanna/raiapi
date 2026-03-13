package service

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

func (s *RaiApiService) getVideoUrl(ctx context.Context, videoURL string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodHead, videoURL, nil)
	if err != nil {
		return videoURL, nil
	}
	req.Header.Set("User-Agent", "rai")

	resp, err := s.client.Do(req)
	if err != nil {
		slog.DebugContext(ctx, "failed to HEAD video URL", "url", videoURL, "error", err)
		return videoURL, nil
	}
	defer func() {
		if _, err := io.Copy(io.Discard, resp.Body); err != nil {
			slog.DebugContext(ctx, "failed to drain response body", "error", err)
		}
		if err := resp.Body.Close(); err != nil {
			slog.DebugContext(ctx, "failed to close response body", "error", err)
		}
	}()

	fileURL := resp.Request.URL.String()
	if strings.HasSuffix(fileURL, "video_no_available.mp4") {
		return videoURL, nil
	}
	return fileURL, nil
}

func (s *RaiApiService) getEffectiveUrl(ctx context.Context, videoURL string, requestedQuality int) (string, error) {
	fileURL, err := s.getVideoUrl(ctx, videoURL)
	if err != nil {
		return videoURL, nil
	}

	matches := urlRegex.FindStringSubmatch(fileURL)
	if len(matches) > 2 {
		qualitiesRaw := strings.Split(matches[2], ",")
		var qualities []string
		for _, q := range qualitiesRaw {
			if q != "" {
				qualities = append(qualities, q)
			}
		}

		if len(qualities) > 0 {
			qualityIndex := requestedQuality
			if qualityIndex >= len(qualities) {
				qualityIndex = len(qualities) - 1
			}

			// Try servers
			raceCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
			defer cancel()

			resultChan := make(chan string, 1)

			for _, server := range servers {
				go func(srv string) {
					targetURL := fmt.Sprintf("https://%s%s_%s.mp4", srv, matches[1], qualities[qualityIndex])
					req, err := http.NewRequestWithContext(raceCtx, http.MethodHead, targetURL, nil)
					if err != nil {
						return
					}
					req.Header.Set("User-Agent", UserAgent)

					resp, err := s.client.Do(req)
					if err == nil {
						defer func() {
							if _, err := io.Copy(io.Discard, resp.Body); err != nil {
								slog.DebugContext(raceCtx, "failed to drain response body in race", "error", err)
							}
							if err := resp.Body.Close(); err != nil {
								slog.DebugContext(raceCtx, "failed to close response body in race", "error", err)
							}
						}()
						if resp.StatusCode == http.StatusOK {
							select {
							case resultChan <- targetURL:
							case <-raceCtx.Done():
							}
						}
					}
				}(server)
			}

			select {
			case res := <-resultChan:
				return res, nil
			case <-raceCtx.Done():
				// Timeout or all failed
			}
		}
	}

	// Ensure https for original fallback
	if strings.HasPrefix(fileURL, "http://") {
		return strings.Replace(fileURL, "http://", "https://", 1), nil
	}
	return fileURL, nil
}
