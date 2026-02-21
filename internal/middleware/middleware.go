package middleware

import (
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

// Logger middleware
func Logger(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		duration := time.Since(start)

		logger.Info("Request handled",
			"method", r.Method,
			"path", r.URL.Path,
			"duration", duration,
			"remote_addr", r.RemoteAddr,
		)
	})
}

// CacheHeaders middleware
func CacheHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		now := time.Now().UTC()
		endOfDay := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, time.UTC)
		startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

		maxAge := int(endOfDay.Sub(now).Seconds())

		w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d", maxAge))
		w.Header().Set("Last-Modified", startOfDay.Format(http.TimeFormat))
		w.Header().Set("Expires", endOfDay.Format(http.TimeFormat))

		next.ServeHTTP(w, r)
	})
}
