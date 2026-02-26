package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestDateValidator(t *testing.T) {
	tests := []struct {
		name           string
		queryDate      string
		expectedStatus int
		expectInCtx    bool
	}{
		{
			name:           "No date param (default to yesterday)",
			queryDate:      "",
			expectedStatus: http.StatusOK,
			expectInCtx:    true,
		},
		{
			name:           "Valid date (yesterday)",
			queryDate:      time.Now().AddDate(0, 0, -1).Format("2006-01-02"),
			expectedStatus: http.StatusOK,
			expectInCtx:    true,
		},
		{
			name:           "Valid date (7 days ago)",
			queryDate:      time.Now().AddDate(0, 0, -7).Format("2006-01-02"),
			expectedStatus: http.StatusOK,
			expectInCtx:    true,
		},
		{
			name:           "Invalid date (today)",
			queryDate:      time.Now().Format("2006-01-02"),
			expectedStatus: http.StatusBadRequest,
			expectInCtx:    false,
		},
		{
			name:           "Invalid date (8 days ago)",
			queryDate:      time.Now().AddDate(0, 0, -8).Format("2006-01-02"),
			expectedStatus: http.StatusBadRequest,
			expectInCtx:    false,
		},
		{
			name:           "Invalid format",
			queryDate:      "invalid-date",
			expectedStatus: http.StatusBadRequest,
			expectInCtx:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", "/?data="+tt.queryDate, nil)
			if tt.queryDate == "" {
				req, err = http.NewRequest("GET", "/", nil)
			}
			if err != nil {
				t.Fatal(err)
			}

			rr := httptest.NewRecorder()

			// Dummy handler to check context
			handler := DateValidator(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				val := r.Context().Value(DateContextKey)
				if tt.expectInCtx {
					if val == nil {
						t.Error("Expected date in context, got nil")
					} else if _, ok := val.(time.Time); !ok {
						t.Errorf("Expected time.Time in context, got %T", val)
					}
				}
				w.WriteHeader(http.StatusOK)
			}))

			handler.ServeHTTP(rr, req)

			if status := rr.Code; status != tt.expectedStatus {
				t.Errorf("handler returned wrong status code: got %v want %v",
					status, tt.expectedStatus)
			}
		})
	}
}
