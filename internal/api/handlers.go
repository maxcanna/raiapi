package api

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log/slog"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"go.massi.dev/raiapi/internal/middleware"
	"go.massi.dev/raiapi/internal/model"
	"go.massi.dev/raiapi/internal/service"
)

type Handler struct {
	Service *service.RaiApiService
}

func NewHandler(svc *service.RaiApiService) *Handler {
	return &Handler{Service: svc}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	// API routes
	mux.HandleFunc("GET /api/canali", h.ListCanali)
	mux.HandleFunc("GET /api/canali/{canale}/programmi", h.ListProgrammi)
	mux.HandleFunc("GET /api/canali/{canale}/programmi/{programma}/qualita", h.ListQualita)
	mux.HandleFunc("GET /api/canali/{canale}/programmi/{programma}/qualita/{qualita}/{action}", h.GetFileAction)

	// RSS routes
	// Note: Wildcard must be the entire segment. So we match {file} and check suffix.
	mux.HandleFunc("GET /rss/canali/{file}", h.GetRSS)

	// Robots.txt
	mux.HandleFunc("GET /robots.txt", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		fmt.Fprintln(w, "User-agent: *")
		fmt.Fprintln(w, "Disallow: /")
	})
}

// Helper to get date from context (set by middleware)
func getDateFromContext(r *http.Request) (time.Time, error) {
	if val := r.Context().Value(middleware.DateContextKey); val != nil {
		if d, ok := val.(time.Time); ok {
			return d, nil
		}
	}
	return time.Time{}, fmt.Errorf("Date not found in context")
}

func (h *Handler) ListCanali(w http.ResponseWriter, r *http.Request) {
	canali := h.Service.ListCanali(r.Context())
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if err := json.NewEncoder(w).Encode(canali); err != nil {
		slog.Error("ListCanali encode error", "error", err)
	}
}

func (h *Handler) ListProgrammi(w http.ResponseWriter, r *http.Request) {
	canaleStr := r.PathValue("canale")
	canaleID, err := strconv.Atoi(canaleStr)
	if err != nil {
		http.Error(w, "Invalid channel ID", http.StatusBadRequest)
		return
	}

	date, err := getDateFromContext(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	programmi, err := h.Service.ListProgrammi(r.Context(), canaleID, date)
	if err != nil {
		if err.Error() == "Dati non disponibili" {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		slog.Error("ListProgrammi error", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	json.NewEncoder(w).Encode(programmi)
}

func (h *Handler) ListQualita(w http.ResponseWriter, r *http.Request) {
	canaleStr := r.PathValue("canale")
	programmaStr := r.PathValue("programma")

	canaleID, err := strconv.Atoi(canaleStr)
	if err != nil {
		http.Error(w, "Invalid channel ID", http.StatusBadRequest)
		return
	}
	programmaID, err := strconv.Atoi(programmaStr)
	if err != nil {
		http.Error(w, "Invalid program ID", http.StatusBadRequest)
		return
	}

	date, err := getDateFromContext(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	qualita, err := h.Service.ListQualita(r.Context(), canaleID, date, programmaID)
	if err != nil {
		if err.Error() == "Dati non disponibili" {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		slog.Error("ListQualita error", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	json.NewEncoder(w).Encode(qualita)
}

func (h *Handler) GetFileAction(w http.ResponseWriter, r *http.Request) {
	canaleStr := r.PathValue("canale")
	programmaStr := r.PathValue("programma")
	qualitaStr := r.PathValue("qualita")
	action := r.PathValue("action")

	if action != "file" && action != "url" {
		http.Error(w, "Azione non valida", http.StatusBadRequest)
		return
	}

	canaleID, err := strconv.Atoi(canaleStr)
	if err != nil {
		http.Error(w, "Invalid channel ID", http.StatusBadRequest)
		return
	}
	programmaID, err := strconv.Atoi(programmaStr)
	if err != nil {
		http.Error(w, "Invalid program ID", http.StatusBadRequest)
		return
	}
	qualitaID, err := strconv.Atoi(qualitaStr)
	if err != nil {
		http.Error(w, "Invalid quality ID", http.StatusBadRequest)
		return
	}

	date, err := getDateFromContext(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	url, err := h.Service.GetFileUrl(r.Context(), canaleID, date, programmaID, qualitaID)
	if err != nil {
		if err.Error() == "Dati non disponibili" {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		slog.Error("GetFileUrl error", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if action == "file" {
		http.Redirect(w, r, url, http.StatusFound)
	} else {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		json.NewEncoder(w).Encode(map[string]string{"url": url})
	}
}

func (h *Handler) GetRSS(w http.ResponseWriter, r *http.Request) {
	fileStr := r.PathValue("file")
	if !strings.HasSuffix(fileStr, ".xml") {
		http.NotFound(w, r)
		return
	}
	canaleStr := strings.TrimSuffix(fileStr, ".xml")

	canaleID, err := strconv.Atoi(canaleStr)
	if err != nil {
		http.Error(w, "Invalid channel ID", http.StatusBadRequest)
		return
	}

	date, err := getDateFromContext(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch data
	programmi, err := h.Service.GetAll(r.Context(), canaleID, date)
	if err != nil {
		slog.Error("GetAll error", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	canali := h.Service.ListCanali(r.Context())
	if canaleID >= len(canali) {
		http.Error(w, "Channel not found", http.StatusNotFound)
		return
	}
	canaleName := canali[canaleID].Name

	hostname := r.Host
	requestURL := r.URL.String()

	// Prepare RSS data
	rssItems := make([]model.RSSItem, 0, len(programmi))
	for _, p := range programmi {
		parts := strings.Split(p.Orario, ":")
		hStr, mStr := "00", "00"
		if len(parts) >= 2 {
			hStr, mStr = parts[0], parts[1]
		}
		h, _ := strconv.Atoi(hStr)
		m, _ := strconv.Atoi(mStr)

		pubDate := time.Date(date.Year(), date.Month(), date.Day(), h, m, 0, 0, date.Location())

		dateTag := date.Format("2006.01.02")

		rssItems = append(rssItems, model.RSSItem{
			Name:    p.Name,
			DateTag: dateTag,
			URL:     p.URL,
			PubDate: pubDate.Format(time.RFC1123),
		})
	}

	data := model.RSSData{
		Canale:    canaleName,
		Hostname:  hostname,
		URL:       requestURL,
		Today:     date,
		Programmi: rssItems,
	}

	// Render template
	tmplPath := filepath.Join("web", "templates", "rss.xml")
	tmpl, err := template.ParseFiles(tmplPath)
	if err != nil {
		slog.Error("Template error", "error", err)
		http.Error(w, "Template error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/xml; charset=utf-8")

	if err := tmpl.Execute(w, data); err != nil {
		slog.Error("Template execute error", "error", err)
	}
}
