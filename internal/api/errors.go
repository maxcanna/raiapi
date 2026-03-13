package api

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"go.massi.dev/raiapi/internal/model"
)

// APIError represents an error that occurred during an API request.
type APIError struct {
	Status  int    `json:"status"`
	Message string `json:"message"`
	Err     error  `json:"-"` // Internal error for logging
}

func (e *APIError) Error() string {
	if e.Err != nil {
		return e.Err.Error()
	}
	return e.Message
}

// NewAPIError creates a new APIError.
func NewAPIError(status int, message string, err error) *APIError {
	return &APIError{
		Status:  status,
		Message: message,
		Err:     err,
	}
}

// AppHandler is a custom handler type that returns an error.
type AppHandler func(w http.ResponseWriter, r *http.Request) error

// handleError is the central point for logging and responding to errors.
func (h *Handler) handleError(w http.ResponseWriter, r *http.Request, err error) {
	var apiErr *APIError

	switch e := err.(type) {
	case *APIError:
		apiErr = e
	default:
		// Default to 500 for unknown errors
		apiErr = NewAPIError(http.StatusInternalServerError, "internal server error", err)
	}

	// 1. Centralized logging - We log everything internally
	slog.ErrorContext(r.Context(), "api error",
		"status", apiErr.Status,
		"public_message", apiErr.Message,
		"internal_error", apiErr.Err,
		"path", r.URL.Path,
		"method", r.Method,
	)

	// 2. Response sanitization - Never leak internal details for 5xx errors
	displayMessage := apiErr.Message
	if apiErr.Status >= 500 {
		displayMessage = "internal server error"
	}

	// 3. Return structured JSON response to the client
	w.WriteHeader(apiErr.Status)

	response := model.ErrorResponse{
		Status:  apiErr.Status,
		Message: displayMessage,
	}

	if encodeErr := json.NewEncoder(w).Encode(response); encodeErr != nil {
		slog.ErrorContext(r.Context(), "failed to encode error response", "error", encodeErr)
	}
}

// Wrap converts an AppHandler into a standard http.HandlerFunc.
func (h *Handler) Wrap(fn AppHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := fn(w, r); err != nil {
			h.handleError(w, r, err)
		}
	}
}
