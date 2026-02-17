package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/gorilla/handlers"
	"go.massi.dev/raiapi/internal/api"
	"go.massi.dev/raiapi/internal/middleware"
	"go.massi.dev/raiapi/internal/service"
)

func main() {
	// Initialize structured logger
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	mongoURL := os.Getenv("MONGO_URL")

	svc, err := service.NewRaiApiService(mongoURL)
	if err != nil {
		slog.Error("Failed to initialize service", "error", err)
		os.Exit(1)
	}

	handler := api.NewHandler(svc)

	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	// Static files
	fs := http.FileServer(http.Dir("public"))
	spaHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if strings.HasPrefix(path, "/api") || strings.HasPrefix(path, "/rss") {
			http.NotFound(w, r)
			return
		}

		cleanPath := filepath.Clean(path)
		fullPath := filepath.Join("public", cleanPath)
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			http.ServeFile(w, r, "public/index.html")
			return
		}
		fs.ServeHTTP(w, r)
	})

	mux.Handle("/", spaHandler)

	// Middleware chaining
	var finalHandler http.Handler = mux

	// DateValidator applies only to API routes usually, but if global:
	// If query param "data" exists, it validates.
	finalHandler = middleware.DateValidator(finalHandler)

	finalHandler = middleware.CacheHeaders(finalHandler)
	finalHandler = handlers.CompressHandler(finalHandler) // Replaces middleware.Gzip
	finalHandler = middleware.Logger(logger, finalHandler)

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: finalHandler,
	}

	go func() {
		slog.Info("Server listening", "port", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("ListenAndServe failed", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("Server forced to shutdown", "error", err)
	}
	slog.Info("Server exiting")
}
