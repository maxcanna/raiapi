package middleware

import (
	"context"
	"net/http"
	"time"
)

type contextKey string

const DateContextKey contextKey = "date"

// DateValidator middleware
func DateValidator(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		dateStr := r.URL.Query().Get("data")

		now := time.Now()
		// Normalize to UTC midnight for consistent comparison
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

		var d time.Time
		var err error

		if dateStr == "" {
			d = today.AddDate(0, 0, -1) // Yesterday
		} else {
			d, err = time.Parse("2006-01-02", dateStr)
			if err != nil {
				http.Error(w, "Data non valida", http.StatusBadRequest)
				return
			}
		}

		// Calculate difference in days
		// Note: d from Parse is UTC midnight. today is UTC midnight.
		diff := today.Sub(d).Hours() / 24

		// Validate range [1, 7]
		// JS logic: if (diff > 7 || diff < 1) -> BadRequest
		if diff < 1 || diff > 7 {
			http.Error(w, "Data non valida", http.StatusBadRequest)
			return
		}

		// Store validated date in context
		ctx := context.WithValue(r.Context(), DateContextKey, d)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
