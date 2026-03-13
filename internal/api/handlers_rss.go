package api

import (
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"go.massi.dev/raiapi/internal/model"
)

func (h *Handler) GetRSS(w http.ResponseWriter, r *http.Request) error {
	if h.rssTemplate == nil {
		return NewAPIError(http.StatusInternalServerError, "rss template not available", nil)
	}

	fileStr := r.PathValue(ParamFile)
	if !strings.HasSuffix(fileStr, ".xml") {
		return NewAPIError(http.StatusNotFound, "not found", nil)
	}
	canaleStr := strings.TrimSuffix(fileStr, ".xml")

	canaleID, err := strconv.Atoi(canaleStr)
	if err != nil {
		return NewAPIError(http.StatusBadRequest, "invalid channel id", err)
	}

	date, err := getDateFromContext(r)
	if err != nil {
		return NewAPIError(http.StatusInternalServerError, "failed to get date from context", err)
	}

	// Fetch data via iterator
	programmiIter := h.Service.GetAll(r.Context(), canaleID, date)

	canaliIter := h.Service.ListCanali(r.Context())
	canali := slices.Collect(canaliIter)
	if canaleID >= len(canali) {
		return NewAPIError(http.StatusNotFound, "channel not found", nil)
	}
	canaleName := canali[canaleID].Name

	hostname := r.Host
	requestURL := r.URL.String()

	// Prepare RSS data
	rssItems := make([]model.RSSItem, 0)
	for p := range programmiIter {
		parts := strings.Split(p.Orario, ":")
		hStr, mStr := "00", "00"
		if len(parts) >= 2 {
			hStr, mStr = parts[0], parts[1]
		}
		hh, _ := strconv.Atoi(hStr)
		mm, _ := strconv.Atoi(mStr)

		pubDate := time.Date(date.Year(), date.Month(), date.Day(), hh, mm, 0, 0, date.Location())
		dateTag := date.Format("2006.01.02")

		nameSafe := strings.ReplaceAll(p.Name, "]]>", "]]>]]&gt;<![CDATA[")
		rssItems = append(rssItems, model.RSSItem{
			Name:    nameSafe,
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

	w.Header().Set("Content-Type", "text/xml; charset=utf-8")
	if err := h.rssTemplate.Execute(w, data); err != nil {
		return NewAPIError(http.StatusInternalServerError, "failed to execute template", err)
	}
	return nil
}
