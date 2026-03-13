package middleware

import (
	"compress/gzip"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// Logger middleware
func Logger(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/ready" {
			next.ServeHTTP(w, r)
			return
		}

		start := time.Now()
		next.ServeHTTP(w, r)
		duration := time.Since(start).Milliseconds()

		remoteAddr := r.Header.Get("X-Forwarded-For")
		if remoteAddr != "" {
			remoteAddr = strings.TrimSpace(strings.Split(remoteAddr, ",")[0])
		} else {
			remoteAddr = r.RemoteAddr
		}

		args := []any{
			"method", r.Method,
			"path", r.URL.Path,
			"duration", duration,
			"remote_addr", remoteAddr,
		}

		if userAgent := r.Header.Get("User-Agent"); userAgent != "" {
			args = append(args, "user_agent", userAgent)
		}

		logger.InfoContext(r.Context(), "request handled", args...)
	})
}

// CacheHeaders middleware
func CacheHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		now := time.Now().UTC()
		endOfDay := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, time.UTC)
		startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

		maxAge := int(endOfDay.Sub(now).Seconds())
		if maxAge < 0 {
			maxAge = 0
		}

		w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d", maxAge))
		w.Header().Set("Last-Modified", startOfDay.Format(http.TimeFormat))
		w.Header().Set("Expires", endOfDay.Format(http.TimeFormat))

		next.ServeHTTP(w, r)
	})
}

// JSONContentType middleware
func JSONContentType(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		next.ServeHTTP(w, r)
	})
}

// gzipResponseWriter wraps http.ResponseWriter to compress responses
type gzipResponseWriter struct {
	http.ResponseWriter
	Writer      *gzip.Writer
	wroteHeader bool
	ignore      bool
}

func (w *gzipResponseWriter) WriteHeader(statusCode int) {
	if w.wroteHeader {
		return
	}
	w.wroteHeader = true
	if statusCode == http.StatusNoContent || statusCode == http.StatusNotModified || statusCode < 200 {
		w.ignore = true
		w.Header().Del("Content-Encoding")
	}
	w.ResponseWriter.WriteHeader(statusCode)
}

func (w *gzipResponseWriter) Write(b []byte) (int, error) {
	if !w.wroteHeader {
		w.WriteHeader(http.StatusOK)
	}
	if w.ignore {
		return w.ResponseWriter.Write(b)
	}
	return w.Writer.Write(b)
}

func (w *gzipResponseWriter) Close() error {
	if w.ignore {
		return nil
	}
	return w.Writer.Close()
}

// Gzip middleware
func Gzip(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}

		// Don't gzip if already encoded
		if w.Header().Get("Content-Encoding") != "" {
			next.ServeHTTP(w, r)
			return
		}

		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Add("Vary", "Accept-Encoding")

		gz := gzip.NewWriter(w)
		gzw := &gzipResponseWriter{ResponseWriter: w, Writer: gz}

		defer func() {
			if err := gzw.Close(); err != nil {
				slog.ErrorContext(r.Context(), "gzip close error", "error", err)
			}
		}()

		next.ServeHTTP(gzw, r)
	})
}
