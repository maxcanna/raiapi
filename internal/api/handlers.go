package api

import (
	"fmt"
	"log/slog"
	"net/http"
	"text/template"
	"time"

	"go.massi.dev/raiapi/internal/middleware"
	"go.massi.dev/raiapi/internal/service"
	"go.massi.dev/raiapi/internal/templates"
)

type Handler struct {
	Service     *service.RaiApiService
	rssTemplate *template.Template
}

func NewHandler(svc *service.RaiApiService) *Handler {
	tmpl, err := template.ParseFS(templates.FS, "rss.xml")
	if err != nil {
		slog.Error("failed to parse embedded rss template", "error", err)
	}

	return &Handler{
		Service:     svc,
		rssTemplate: tmpl,
	}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	// API routes
	mux.HandleFunc("GET /api/canali", h.Wrap(h.ListCanali))
	mux.HandleFunc(fmt.Sprintf("GET /api/canali/{%s}/programmi", ParamCanale), h.Wrap(h.ListProgrammi))
	mux.HandleFunc(fmt.Sprintf("GET /api/canali/{%s}/programmi/{%s}/qualita", ParamCanale, ParamProgramma), h.Wrap(h.ListQualita))
	mux.HandleFunc(fmt.Sprintf("GET /api/canali/{%s}/programmi/{%s}/qualita/{%s}/{%s}", ParamCanale, ParamProgramma, ParamQualita, ParamAction), h.Wrap(h.GetFileAction))

	// RSS routes
	mux.HandleFunc(fmt.Sprintf("GET /rss/canali/{%s}", ParamFile), h.Wrap(h.GetRSS))

	// Robots.txt
	mux.HandleFunc("GET /robots.txt", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		if _, err := fmt.Fprintln(w, "User-agent: *\nDisallow: /"); err != nil {
			slog.DebugContext(r.Context(), "failed to write robots.txt", "error", err)
		}
	})
}

func getDateFromContext(r *http.Request) (time.Time, error) {
	if val := r.Context().Value(middleware.DateContextKey); val != nil {
		if d, ok := val.(time.Time); ok {
			return d, nil
		}
	}
	return time.Time{}, fmt.Errorf("date not found in context")
}
