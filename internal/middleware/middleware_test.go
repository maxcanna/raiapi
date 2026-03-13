package middleware

import (
	"bytes"
	"compress/gzip"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestLogger(t *testing.T) {
	buf := new(bytes.Buffer)
	logger := slog.New(slog.NewJSONHandler(buf, nil))

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mw := Logger(logger, handler)
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	mw.ServeHTTP(rec, req)

	output := buf.String()
	if !strings.Contains(output, "request handled") {
		t.Errorf("expected log output to contain 'request handled', got %s", output)
	}
	if !strings.Contains(output, "\"method\":\"GET\"") {
		t.Errorf("expected log output to contain method GET, got %s", output)
	}
	if !strings.Contains(output, "\"path\":\"/test\"") {
		t.Errorf("expected log output to contain path /test, got %s", output)
	}
}

func TestLoggerXForwardedFor(t *testing.T) {
	buf := new(bytes.Buffer)
	logger := slog.New(slog.NewJSONHandler(buf, nil))

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mw := Logger(logger, handler)
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("X-Forwarded-For", "1.2.3.4, 5.6.7.8, 9.0.1.2")
	rec := httptest.NewRecorder()

	mw.ServeHTTP(rec, req)

	output := buf.String()
	if !strings.Contains(output, "\"remote_addr\":\"1.2.3.4\"") {
		t.Errorf("expected log output to contain remote_addr 1.2.3.4, got %s", output)
	}
	if strings.Contains(output, "5.6.7.8") {
		t.Errorf("expected log output not to contain other IPs, got %s", output)
	}
}

func TestCacheHeaders(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mw := CacheHeaders(handler)
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	mw.ServeHTTP(rec, req)

	cc := rec.Header().Get("Cache-Control")
	if !strings.HasPrefix(cc, "public, max-age=") {
		t.Errorf("expected Cache-Control header to start with 'public, max-age=', got %s", cc)
	}

	if rec.Header().Get("Last-Modified") == "" {
		t.Error("expected Last-Modified header to be set")
	}

	if rec.Header().Get("Expires") == "" {
		t.Error("expected Expires header to be set")
	}
}

func TestGzip(t *testing.T) {
	testContent := "this is some test content that should be compressed"
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(testContent))
	})

	mw := Gzip(handler)

	t.Run("without gzip header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rec := httptest.NewRecorder()
		mw.ServeHTTP(rec, req)

		if rec.Header().Get("Content-Encoding") == "gzip" {
			t.Error("did not expect gzip content encoding")
		}
		if rec.Body.String() != testContent {
			t.Errorf("expected %s, got %s", testContent, rec.Body.String())
		}
	})

	t.Run("with gzip header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Accept-Encoding", "gzip")
		rec := httptest.NewRecorder()
		mw.ServeHTTP(rec, req)

		if rec.Header().Get("Content-Encoding") != "gzip" {
			t.Error("expected gzip content encoding")
		}

		gz, err := gzip.NewReader(rec.Body)
		if err != nil {
			t.Fatalf("failed to create gzip reader: %v", err)
		}
		defer func() { _ = gz.Close() }()

		body, err := io.ReadAll(gz)
		if err != nil {
			t.Fatalf("failed to read gzipped body: %v", err)
		}

		if string(body) != testContent {
			t.Errorf("expected %s, got %s", testContent, string(body))
		}
	})

	t.Run("with 204 No Content", func(t *testing.T) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		})
		mw := Gzip(handler)

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Accept-Encoding", "gzip")
		rec := httptest.NewRecorder()
		mw.ServeHTTP(rec, req)

		if rec.Code != http.StatusNoContent {
			t.Errorf("expected status 204, got %d", rec.Code)
		}
		if rec.Header().Get("Content-Encoding") == "gzip" {
			t.Error("did not expect gzip content encoding for 204")
		}
	})
}
