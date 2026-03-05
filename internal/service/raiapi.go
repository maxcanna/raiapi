package service

import (
	"context"
	"errors"
	"fmt"
	"iter"
	"log/slog"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"go.massi.dev/raiapi/internal/model"
)

const (
	DefaultBaseURL = "https://www.raiplay.it"
	UserAgent      = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.94 Safari/537.36"
)

var (
	urlRegex = regexp.MustCompile(`.*(\/podcast.*)_((,\d+)+).*`)

	channelNames = []string{
		"Rai1", "Rai2", "Rai3", "Rai4", "Rai Gulp", "Rai5", "Rai Premium",
		"Rai Yoyo", "Rai Movie", "Rai Storia", "Rai Scuola", "Rai News 24",
		"Rai Sport Piu", "Rai Sport",
	}

	channelMap = map[string]string{
		"Rai1":          "rai-1",
		"Rai2":          "rai-2",
		"Rai3":          "rai-3",
		"Rai4":          "rai-4",
		"Rai Gulp":      "rai-gulp",
		"Rai5":          "rai-5",
		"Rai Premium":   "rai-premium",
		"Rai Yoyo":      "rai-yoyo",
		"Rai Movie":     "rai-movie",
		"Rai Storia":    "rai-storia",
		"Rai Scuola":    "rai-scuola",
		"Rai News 24":   "rai-news-24",
		"Rai Sport Piu": "rai-sport-piu-hd",
		"Rai Sport":     "rai-sport",
	}

	servers []string
)

func init() {
	hosts := []string{
		"creativemedia?.rai.it",
		"creativemedia?-rai-it.akamaized.net",
		"download?.rai.it",
		"download?-geo.rai.it",
		"creativemediax?.rai.it",
	}

	for _, host := range hosts {
		for i := 0; i < 10; i++ {
			servers = append(servers, strings.Replace(host, "?", fmt.Sprintf("%d", i), 1))
		}
	}
}

// Cache defines the interface for program caching
type Cache interface {
	Get(ctx context.Context, key string) ([]model.RaiPlayEvent, error)
	Set(ctx context.Context, key string, programs []model.RaiPlayEvent) error
}

type RaiApiService struct {
	client  *http.Client
	cache   Cache
	baseURL string
}

func NewRaiApiService(baseURL string) (*RaiApiService, error) {
	tr := http.DefaultTransport.(*http.Transport).Clone()
	tr.MaxIdleConns = 100
	tr.MaxIdleConnsPerHost = 10
	tr.IdleConnTimeout = 90 * time.Second

	client := &http.Client{
		Timeout:   30 * time.Second,
		Transport: tr,
	}

	var cache Cache
	if mongoURL := os.Getenv("MONGO_URL"); mongoURL != "" {
		mongoCache, err := NewMongoCache(ctxBackground(), mongoURL)
		if err != nil {
			slog.Warn("failed to initialize mongodb cache, proceeding without cache", "error", err)
		} else {
			cache = mongoCache
		}
	}

	return &RaiApiService{
		client:  client,
		cache:   cache,
		baseURL: baseURL,
	}, nil
}

// Internal helper for background context during initialization
func ctxBackground() context.Context {
	return context.Background()
}

func (s *RaiApiService) ListCanali(ctx context.Context) iter.Seq[model.Canale] {
	return func(yield func(model.Canale) bool) {
		for i, name := range channelNames {
			if !yield(model.Canale{ID: i, Name: name}) {
				return
			}
		}
	}
}

func (s *RaiApiService) getChannelIdentifier(idCanale int) (string, error) {
	if idCanale < 0 || idCanale >= len(channelNames) {
		return "", errors.New("invalid channel id")
	}
	name := channelNames[idCanale]
	return channelMap[name], nil
}

func (s *RaiApiService) getDocumentIndexForDate(idCanale int, date time.Time) (string, error) {
	identifier, err := s.getChannelIdentifier(idCanale)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s:%s", identifier, date.Format("2006:01:02")), nil
}
