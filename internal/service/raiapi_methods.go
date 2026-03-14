package service

import (
	"context"
	"errors"
	"iter"
	"log/slog"
	"net/url"
	"strings"
	"time"

	"go.massi.dev/raiapi/internal/model"
)

func (s *RaiApiService) GetAll(ctx context.Context, idCanale int, date time.Time) iter.Seq[model.ProgrammaRSS] {
	return func(yield func(model.ProgrammaRSS) bool) {
		programmi, err := s.getData(ctx, idCanale, date)
		if err != nil {
			slog.ErrorContext(ctx, "failed to get data for rss", "error", err)
			return
		}
		if len(programmi) == 0 {
			return
		}

		for _, p := range programmi {
			if !yield(model.ProgrammaRSS{
				Name:   p.Name,
				Orario: p.TimePublished,
				URL:    s.baseURL + p.Weblink,
			}) {
				return
			}
		}
	}
}

func (s *RaiApiService) ListProgrammi(ctx context.Context, idCanale int, date time.Time) iter.Seq2[model.Programma, error] {
	return func(yield func(model.Programma, error) bool) {
		programmi, err := s.getData(ctx, idCanale, date)
		if err != nil {
			yield(model.Programma{}, err)
			return
		}
		if len(programmi) == 0 {
			yield(model.Programma{}, errors.New("dati non disponibili"))
			return
		}

		for i, p := range programmi {
			image := ""
			if p.Images.Landscape != "" {
				// Ensure absolute URL
				u, err := url.Parse(p.Images.Landscape)
				if err == nil && u.Host == "" {
					image = s.baseURL + p.Images.Landscape
				} else if err == nil {
					image = p.Images.Landscape
				} else {
					slog.DebugContext(ctx, "failed to parse image url", "url", p.Images.Landscape, "error", err)
					image = p.Images.Landscape
				}
			}
			if !yield(model.Programma{
				ID:          i,
				Name:        strings.TrimSpace(p.Name),
				Image:       image,
				Description: p.Description,
			}, nil) {
				return
			}
		}
	}
}

func (s *RaiApiService) ListQualita(ctx context.Context, idCanale int, date time.Time, idProgramma int) iter.Seq2[model.Qualita, error] {
	return func(yield func(model.Qualita, error) bool) {
		programmi, err := s.getData(ctx, idCanale, date)
		if err != nil {
			yield(model.Qualita{}, err)
			return
		}
		if len(programmi) == 0 || idProgramma >= len(programmi) {
			yield(model.Qualita{}, errors.New("dati non disponibili"))
			return
		}

		programma := programmi[idProgramma]
		if programma.Video == nil || programma.Video.ContentURL == "" {
			yield(model.Qualita{}, errors.New("dati non disponibili"))
			return
		}

		fileURL, err := s.getVideoUrl(ctx, programma.Video.ContentURL)
		if err != nil {
			yield(model.Qualita{}, err)
			return
		}

		matches := urlRegex.FindStringSubmatch(fileURL)
		var qualities []string
		if len(matches) > 2 {
			for q := range strings.SplitSeq(matches[2], ",") {
				if q != "" {
					qualities = append(qualities, q)
				}
			}
		} else {
			qualities = []string{"1800"}
		}

		for i, q := range qualities {
			if !yield(model.Qualita{
				ID:   i,
				Name: "h264 " + q,
			}, nil) {
				return
			}
		}
	}
}

func (s *RaiApiService) GetFileUrl(ctx context.Context, idCanale int, date time.Time, idProgramma int, quality int) (string, error) {
	programmi, err := s.getData(ctx, idCanale, date)
	if err != nil {
		return "", err
	}
	if len(programmi) == 0 || idProgramma >= len(programmi) {
		return "", errors.New("dati non disponibili")
	}

	programma := programmi[idProgramma]
	if programma.Video == nil || programma.Video.ContentURL == "" {
		return "", errors.New("dati non disponibili")
	}

	return s.getEffectiveUrl(ctx, programma.Video.ContentURL, quality)
}
