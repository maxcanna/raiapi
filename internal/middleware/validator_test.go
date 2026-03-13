package middleware

import (
	"testing"
	"time"
)

func TestParseAndValidateDate(t *testing.T) {
	tests := []struct {
		name        string
		queryDate   string
		expectError bool
	}{
		{
			name:        "No date param (default to yesterday)",
			queryDate:   "",
			expectError: false,
		},
		{
			name:        "Valid date (yesterday)",
			queryDate:   time.Now().AddDate(0, 0, -1).Format("2006-01-02"),
			expectError: false,
		},
		{
			name:        "Valid date (7 days ago)",
			queryDate:   time.Now().AddDate(0, 0, -7).Format("2006-01-02"),
			expectError: false,
		},
		{
			name:        "Invalid date (today)",
			queryDate:   time.Now().Format("2006-01-02"),
			expectError: true,
		},
		{
			name:        "Invalid date (8 days ago)",
			queryDate:   time.Now().AddDate(0, 0, -8).Format("2006-01-02"),
			expectError: true,
		},
		{
			name:        "Invalid format",
			queryDate:   "invalid-date",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ParseAndValidateDate(tt.queryDate)
			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Did not expect error but got: %v", err)
				}
			}
		})
	}
}
