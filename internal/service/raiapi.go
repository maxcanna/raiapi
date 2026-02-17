package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"go.massi.dev/raiapi/internal/model"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
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

type RaiApiService struct {
	client  *http.Client
	db      *mongo.Database
	BaseURL string
}

func NewRaiApiService(mongoURL string) (*RaiApiService, error) {
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	var db *mongo.Database
	if mongoURL != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		clientOptions := options.Client().ApplyURI(mongoURL)
		mongoClient, err := mongo.Connect(ctx, clientOptions)
		if err != nil {
			return nil, fmt.Errorf("failed to connect to mongo: %w", err)
		}
		// Verify connection
		err = mongoClient.Ping(ctx, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to ping mongo: %w", err)
		}

		dbName := "raiapi"
		if strings.Contains(mongoURL, "/raiapi-test") {
			dbName = "raiapi-test"
		} else if strings.Contains(mongoURL, "/raiapi") {
			dbName = "raiapi"
		}
		db = mongoClient.Database(dbName)
	}

	return &RaiApiService{
		client:  client,
		db:      db,
		BaseURL: DefaultBaseURL,
	}, nil
}

func (s *RaiApiService) ListCanali() []model.Canale {
	var canali []model.Canale
	for i, name := range channelNames {
		canali = append(canali, model.Canale{ID: i, Name: name})
	}
	return canali
}

func (s *RaiApiService) getChannelIdentifier(idCanale int) (string, error) {
	if idCanale < 0 || idCanale >= len(channelNames) {
		return "", errors.New("invalid channel id")
	}
	name := channelNames[idCanale]
	return channelMap[name], nil
}

func (s *RaiApiService) getDocumentIndex(idCanale int, date time.Time) (string, error) {
	identifier, err := s.getChannelIdentifier(idCanale)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s:%s", identifier, date.Format("2006:01:02")), nil
}

func (s *RaiApiService) fetchPage(idCanale int, date time.Time) ([]model.RaiPlayEvent, error) {
	canaleIdentifier, err := s.getChannelIdentifier(idCanale)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("%s/palinsesto/app/%s/%s.json", s.BaseURL, canaleIdentifier, date.Format("02-01-2006"))

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", UserAgent)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return []model.RaiPlayEvent{}, nil
	}

	var body struct {
		Events []struct {
			HasVideo bool   `json:"has_video"`
			PathID   string `json:"path_id"`
		} `json:"events"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, err
	}

	var fetchURLs []string
	for _, evt := range body.Events {
		if evt.HasVideo {
			fetchURLs = append(fetchURLs, s.BaseURL+evt.PathID)
		}
	}

	if len(fetchURLs) == 0 {
		return []model.RaiPlayEvent{}, nil
	}

	// Fetch details concurrently
	var wg sync.WaitGroup
	results := make(chan model.RaiPlayEvent, len(fetchURLs))
	sem := make(chan struct{}, 10) // Limit concurrency

	for _, u := range fetchURLs {
		wg.Add(1)
		go func(targetURL string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			req, _ := http.NewRequest("GET", targetURL, nil)
			req.Header.Set("User-Agent", UserAgent)
			resp, err := s.client.Do(req)
			if err != nil {
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode == 200 {
				var event model.RaiPlayEvent
				if err := json.NewDecoder(resp.Body).Decode(&event); err == nil {
					results <- event
				}
			}
		}(u)
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	var programmi []model.RaiPlayEvent
	for p := range results {
		programmi = append(programmi, p)
	}

	// Cache to Mongo
	if s.db != nil {
		docIndex, _ := s.getDocumentIndex(idCanale, date)
		coll := s.db.Collection("programmi")
		filter := bson.M{"_id": docIndex}
		update := bson.M{
			"$set": bson.M{
				"programmi": programmi,
				"createdAt": time.Now(),
			},
		}
		opts := options.Update().SetUpsert(true)
		_, err = coll.UpdateOne(context.Background(), filter, update, opts)
		if err != nil {
			slog.Error("Failed to update cache", "error", err)
		}
	}

	return programmi, nil
}

func (s *RaiApiService) getData(idCanale int, date time.Time) ([]model.RaiPlayEvent, error) {
	if s.db == nil {
		return s.fetchPage(idCanale, date)
	}

	docIndex, err := s.getDocumentIndex(idCanale, date)
	if err != nil {
		return nil, err
	}

	coll := s.db.Collection("programmi")
	var result model.ProgrammaCached
	err = coll.FindOne(context.Background(), bson.M{"_id": docIndex}).Decode(&result)
	if err == mongo.ErrNoDocuments {
		return s.fetchPage(idCanale, date)
	} else if err != nil {
		slog.Error("Error reading from cache", "error", err)
		return s.fetchPage(idCanale, date)
	}

	return result.Programmi, nil
}

func (s *RaiApiService) getVideoUrl(url string) (string, error) {
	req, err := http.NewRequest("HEAD", url, nil)
	if err != nil {
		return url, nil
	}
	req.Header.Set("User-Agent", "rai")

	resp, err := s.client.Do(req)
	if err != nil {
		return url, nil
	}
	defer resp.Body.Close()

	fileUrl := resp.Request.URL.String()
	if strings.HasSuffix(fileUrl, "video_no_available.mp4") {
		return url, nil
	}
	return fileUrl, nil
}

func (s *RaiApiService) getEffectiveUrl(url string, requestedQuality int) (string, error) {
	fileUrl, err := s.getVideoUrl(url)
	if err != nil {
		return url, nil
	}

	matches := urlRegex.FindStringSubmatch(fileUrl)
	if len(matches) > 2 {
		qualitiesRaw := strings.Split(matches[2], ",")
		var qualities []string
		for _, q := range qualitiesRaw {
			if q != "" {
				qualities = append(qualities, q)
			}
		}

		if len(qualities) > 0 {
			qualityIndex := requestedQuality
			if qualityIndex >= len(qualities) {
				qualityIndex = len(qualities) - 1
			}

			// Try servers
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			resultChan := make(chan string, 1)

			for _, server := range servers {
				go func(srv string) {
					targetURL := fmt.Sprintf("https://%s%s_%s.mp4", srv, matches[1], qualities[qualityIndex])
					req, _ := http.NewRequestWithContext(ctx, "HEAD", targetURL, nil)
					req.Header.Set("User-Agent", UserAgent)

					resp, err := s.client.Do(req)
					if err == nil && resp.StatusCode == 200 {
						select {
						case resultChan <- targetURL:
						case <-ctx.Done():
						}
					}
					if resp != nil {
						resp.Body.Close()
					}
				}(server)
			}

			select {
			case res := <-resultChan:
				return res, nil
			case <-ctx.Done():
				// Timeout or all failed
			}
		}
	}

	return strings.Replace(fileUrl, "http://", "https://", 1), nil
}

func (s *RaiApiService) GetAll(idCanale int, date time.Time) ([]model.ProgrammaRSS, error) {
	programmi, err := s.getData(idCanale, date)
	if err != nil {
		return []model.ProgrammaRSS{}, nil
	}
	if len(programmi) == 0 {
		return []model.ProgrammaRSS{}, nil
	}

	var result []model.ProgrammaRSS
	for _, p := range programmi {
		result = append(result, model.ProgrammaRSS{
			Name:   p.Name,
			Orario: p.TimePublished,
			URL:    s.BaseURL + p.Weblink,
		})
	}
	return result, nil
}

func (s *RaiApiService) ListProgrammi(idCanale int, date time.Time) ([]model.Programma, error) {
	programmi, err := s.getData(idCanale, date)
	if err != nil {
		return nil, err
	}
	if len(programmi) == 0 {
		return nil, errors.New("Dati non disponibili")
	}

	var result []model.Programma
	for i, p := range programmi {
		image := ""
		if p.Images.Landscape != "" {
			image = s.BaseURL + p.Images.Landscape
		}
		result = append(result, model.Programma{
			ID:          i,
			Name:        strings.TrimSpace(p.Name),
			Image:       image,
			Description: p.Description,
		})
	}
	return result, nil
}

func (s *RaiApiService) ListQualita(idCanale int, date time.Time, idProgramma int) ([]model.Qualita, error) {
	programmi, err := s.getData(idCanale, date)
	if err != nil {
		return nil, err
	}
	if len(programmi) == 0 || idProgramma >= len(programmi) {
		return nil, errors.New("Dati non disponibili")
	}

	programma := programmi[idProgramma]
	if programma.Video == nil || programma.Video.ContentURL == "" {
		return nil, errors.New("Dati non disponibili")
	}

	fileUrl, err := s.getVideoUrl(programma.Video.ContentURL)
	if err != nil {
		return nil, err
	}

	matches := urlRegex.FindStringSubmatch(fileUrl)
	var qualities []string
	if len(matches) > 2 {
		for _, q := range strings.Split(matches[2], ",") {
			if q != "" {
				qualities = append(qualities, q)
			}
		}
	} else {
		qualities = []string{"1800"}
	}

	var result []model.Qualita
	for i, q := range qualities {
		result = append(result, model.Qualita{
			ID:   i,
			Name: "h264 " + q,
		})
	}
	return result, nil
}

func (s *RaiApiService) GetFileUrl(idCanale int, date time.Time, idProgramma int, quality int) (string, error) {
	programmi, err := s.getData(idCanale, date)
	if err != nil {
		return "", err
	}
	if len(programmi) == 0 || idProgramma >= len(programmi) {
		return "", errors.New("Dati non disponibili")
	}

	programma := programmi[idProgramma]
	if programma.Video == nil || programma.Video.ContentURL == "" {
		return "", errors.New("Dati non disponibili")
	}

	return s.getEffectiveUrl(programma.Video.ContentURL, quality)
}
