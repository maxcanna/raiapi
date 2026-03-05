package model

// ErrorResponse represents a sanitized error response sent to the client.
type ErrorResponse struct {
	Status  int    `json:"status"`
	Message string `json:"message"`
}
