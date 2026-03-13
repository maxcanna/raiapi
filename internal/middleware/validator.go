package middleware

import (
	"context"
	"errors"
	"net/http"
	"time"
)

type contextKey string

const DateContextKey contextKey = "date"

// ParseAndValidateDate parses the date string and enforces the [1, 7] days past constraint.
func ParseAndValidateDate(dateStr string) (time.Time, error) {
	now := time.Now()
	// Normalize to UTC midnight for consistent comparison
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

	var d time.Time
	var err error

	if dateStr == "" {
		return today.AddDate(0, 0, -1), nil // Default to Yesterday
	}

	d, err = time.Parse("2006-01-02", dateStr)
	if err != nil {
		return time.Time{}, errors.New("data non valida")
	}

	// Calculate difference in days
	diff := today.Sub(d).Hours() / 24

	// Validate range [1, 7]
	if diff < 1 || diff > 7 {
		return time.Time{}, errors.New("data non valida")
	}

	return d, nil
}

// DateValidator middleware
func DateValidator(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		dateStr := r.URL.Query().Get("data")

		d, err := ParseAndValidateDate(dateStr)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Store validated date in context
		ctx := context.WithValue(r.Context(), DateContextKey, d)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
