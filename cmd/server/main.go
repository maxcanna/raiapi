package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"go.massi.dev/raiapi/internal/api"
	"go.massi.dev/raiapi/internal/middleware"
	"go.massi.dev/raiapi/internal/service"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	mongoURL := os.Getenv("MONGO_URL")
	// If mongoURL is empty, service handles it (no cache)

	svc, err := service.NewRaiApiService(mongoURL)
	if err != nil {
		log.Fatalf("Failed to initialize service: %v", err)
	}

	handler := api.NewHandler(svc)

	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	// Static files
	fs := http.FileServer(http.Dir("public"))
	// Fallback for SPA
	spaHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		// If API or RSS, don't fallback (should have been handled by mux patterns but if not matched?)
		// Mux matches specific patterns. If we use `mux.Handle("/", ...)` as catch-all for static files?

		if strings.HasPrefix(path, "/api") || strings.HasPrefix(path, "/rss") {
			http.NotFound(w, r)
			return
		}

		// Check if file exists
		cleanPath := filepath.Clean(path)
		fullPath := filepath.Join("public", cleanPath)
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			http.ServeFile(w, r, "public/index.html")
			return
		}
		fs.ServeHTTP(w, r)
	})

	// Wrap mux with SPA handler?
	// Mux handles /api and /rss.
	// But `http.ServeMux` matches longest pattern.
	// So `mux.Handle("/", spaHandler)` will catch everything else.
	mux.Handle("/", spaHandler)

	// Middleware
	var finalHandler http.Handler = mux
	finalHandler = middleware.CacheHeaders(finalHandler)
	finalHandler = middleware.Gzip(finalHandler) // Compress everything? Or just static?
	// Usually API responses are compressed too.
	// But `CacheHeaders` applies to everything?
	// `middleware-headers-cache.js` applies to `app.use(cacheHeaders)` which is global.
	// So yes.
	finalHandler = middleware.Logger(finalHandler)

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: finalHandler,
	}

	go func() {
		log.Printf("Server listening on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("ListenAndServe: %v", err)
		}
	}()

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}
	log.Println("Server exiting")
}
