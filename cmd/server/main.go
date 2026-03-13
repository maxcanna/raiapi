package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"syscall"

	"go.massi.dev/raiapi/internal/api"
	"go.massi.dev/raiapi/internal/service"
)

func main() {
	// Initialize structured logger
	var logLevel = new(slog.LevelVar)
	logLevel.Set(slog.LevelInfo)
	if _, present := os.LookupEnv("DEBUG"); present {
		logLevel.Set(slog.LevelDebug)
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
	}))
	slog.SetDefault(logger)

	portStr := os.Getenv("PORT")
	port, err := strconv.Atoi(portStr)
	if err != nil || port <= 0 || port > 65535 {
		port = 3000
	}

	cfg := api.Config{
		Port:    port,
		BaseURL: service.DefaultBaseURL,
	}

	srv, err := api.NewServer(cfg, logger)
	if err != nil {
		logger.Error("failed to initialize server", "error", err)
		os.Exit(1)
	}

	// Create context that listens for signals
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := srv.Start(ctx); err != nil {
		logger.Error("server error", "error", err)
		os.Exit(1)
	}
}
