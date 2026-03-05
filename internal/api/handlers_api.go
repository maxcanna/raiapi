package api

import (
	"encoding/json"
	"net/http"
	"slices"
	"strconv"

	"go.massi.dev/raiapi/internal/model"
)

func (h *Handler) ListCanali(w http.ResponseWriter, r *http.Request) error {
	canaliIter := h.Service.ListCanali(r.Context())
	canali := slices.Collect(canaliIter)

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if err := json.NewEncoder(w).Encode(canali); err != nil {
		return NewAPIError(http.StatusInternalServerError, "failed to encode response", err)
	}
	return nil
}

func (h *Handler) ListProgrammi(w http.ResponseWriter, r *http.Request) error {
	canaleStr := r.PathValue(ParamCanale)
	canaleID, err := strconv.Atoi(canaleStr)
	if err != nil {
		return NewAPIError(http.StatusBadRequest, "invalid channel id", err)
	}

	date, err := getDateFromContext(r)
	if err != nil {
		return NewAPIError(http.StatusInternalServerError, "failed to get date from context", err)
	}

	programmiIter := h.Service.ListProgrammi(r.Context(), canaleID, date)
	var programmi []model.Programma
	for p, err := range programmiIter {
		if err != nil {
			if err.Error() == "dati non disponibili" {
				return NewAPIError(http.StatusNotFound, err.Error(), err)
			}
			return NewAPIError(http.StatusInternalServerError, "failed to fetch programmi", err)
		}
		programmi = append(programmi, p)
	}

	if err := json.NewEncoder(w).Encode(programmi); err != nil {
		return NewAPIError(http.StatusInternalServerError, "failed to encode response", err)
	}
	return nil
}

func (h *Handler) ListQualita(w http.ResponseWriter, r *http.Request) error {
	canaleStr := r.PathValue(ParamCanale)
	programmaStr := r.PathValue(ParamProgramma)

	canaleID, err := strconv.Atoi(canaleStr)
	if err != nil {
		return NewAPIError(http.StatusBadRequest, "invalid channel id", err)
	}
	programmaID, err := strconv.Atoi(programmaStr)
	if err != nil {
		return NewAPIError(http.StatusBadRequest, "invalid program id", err)
	}

	date, err := getDateFromContext(r)
	if err != nil {
		return NewAPIError(http.StatusInternalServerError, "failed to get date from context", err)
	}

	qualitaIter := h.Service.ListQualita(r.Context(), canaleID, date, programmaID)
	var qualita []model.Qualita
	for q, err := range qualitaIter {
		if err != nil {
			if err.Error() == "dati non disponibili" {
				return NewAPIError(http.StatusNotFound, err.Error(), err)
			}
			return NewAPIError(http.StatusInternalServerError, "failed to fetch qualita", err)
		}
		qualita = append(qualita, q)
	}

	if err := json.NewEncoder(w).Encode(qualita); err != nil {
		return NewAPIError(http.StatusInternalServerError, "failed to encode response", err)
	}
	return nil
}

func (h *Handler) GetFileAction(w http.ResponseWriter, r *http.Request) error {
	canaleStr := r.PathValue(ParamCanale)
	programmaStr := r.PathValue(ParamProgramma)
	qualitaStr := r.PathValue(ParamQualita)
	action := r.PathValue(ParamAction)

	if action != ActionFile && action != ActionURL {
		return NewAPIError(http.StatusBadRequest, "invalid action", nil)
	}

	canaleID, err := strconv.Atoi(canaleStr)
	if err != nil {
		return NewAPIError(http.StatusBadRequest, "invalid channel id", err)
	}
	programmaID, err := strconv.Atoi(programmaStr)
	if err != nil {
		return NewAPIError(http.StatusBadRequest, "invalid program id", err)
	}
	qualitaID, err := strconv.Atoi(qualitaStr)
	if err != nil {
		return NewAPIError(http.StatusBadRequest, "invalid quality id", err)
	}

	date, err := getDateFromContext(r)
	if err != nil {
		return NewAPIError(http.StatusInternalServerError, "failed to get date from context", err)
	}

	url, err := h.Service.GetFileUrl(r.Context(), canaleID, date, programmaID, qualitaID)
	if err != nil {
		if err.Error() == "dati non disponibili" {
			return NewAPIError(http.StatusNotFound, err.Error(), err)
		}
		return NewAPIError(http.StatusInternalServerError, "failed to get file url", err)
	}

	if action == ActionFile {
		http.Redirect(w, r, url, http.StatusFound)
		return nil
	}

	if err := json.NewEncoder(w).Encode(map[string]string{ActionURL: url}); err != nil {
		return NewAPIError(http.StatusInternalServerError, "failed to encode response", err)
	}
	return nil
}
