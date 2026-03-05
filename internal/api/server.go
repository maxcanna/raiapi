package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"go.massi.dev/raiapi/internal/middleware"
	"go.massi.dev/raiapi/internal/service"
)

// Config holds the server configuration
type Config struct {
	Port    int
	BaseURL string
}

// Server encapsulates the application server and its dependencies
type Server struct {
	cfg     Config
	handler *Handler
	logger  *slog.Logger
}

// NewServer initializes a new Server instance
func NewServer(cfg Config, logger *slog.Logger) (*Server, error) {
	svc, err := service.NewRaiApiService(cfg.BaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize service: %w", err)
	}

	return &Server{
		cfg:     cfg,
		handler: NewHandler(svc),
		logger:  logger,
	}, nil
}

// routes sets up the routing logic and applies middleware
func (s *Server) routes() http.Handler {
	apiMux := http.NewServeMux()
	s.handler.RegisterRoutes(apiMux)

	// Apply scoped middleware to API/RSS routes only
	var apiHandler http.Handler = apiMux
	apiHandler = middleware.JSONContentType(apiHandler)
	apiHandler = middleware.DateValidator(apiHandler)
	apiHandler = middleware.CacheHeaders(apiHandler)

	// Main router
	mainMux := http.NewServeMux()
	mainMux.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	mainMux.Handle("/api/", apiHandler)
	mainMux.Handle("/rss/", apiHandler)
	mainMux.HandleFunc("/robots.txt", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		if _, err := fmt.Fprintln(w, "User-agent: *\nDisallow: /"); err != nil {
			slog.DebugContext(r.Context(), "failed to write robots.txt", "error", err)
		}
	})

	// Static files / SPA handler
	fs := http.FileServer(http.Dir("public"))
	mainMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		cleanPath := filepath.Clean(path)

		// Prevent directory traversal
		if strings.HasPrefix(cleanPath, "..") {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}

		fullPath := filepath.Join("public", cleanPath)
		if fi, err := os.Stat(fullPath); os.IsNotExist(err) || fi.IsDir() {
			// If it's a directory or doesn't exist, serve index.html for SPA
			http.ServeFile(w, r, "public/index.html")
			return
		}
		fs.ServeHTTP(w, r)
	})

	// Global middleware
	var finalHandler http.Handler = mainMux
	finalHandler = middleware.Gzip(finalHandler)
	finalHandler = middleware.Logger(s.logger, finalHandler)

	return finalHandler
}

// Start runs the server and handles graceful shutdown
func (s *Server) Start(ctx context.Context) error {
	srv := &http.Server{
		Addr:              ":" + strconv.Itoa(s.cfg.Port),
		Handler:           s.routes(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	errChan := make(chan error, 1)
	go func() {
		s.logger.Info("server listening", "port", s.cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
	}()

	select {
	case err := <-errChan:
		return fmt.Errorf("listenAndServe failed: %w", err)
	case <-ctx.Done():
		s.logger.Info("shutting down server...")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("server forced to shutdown: %w", err)
	}

	s.logger.Info("server exited")
	return nil
}
