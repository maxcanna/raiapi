package model

type RaiPlayEvent struct {
	HasVideo      bool   `json:"has_video"`
	PathID        string `json:"path_id"`
	Name          string `json:"name"`
	TimePublished string `json:"time_published"`
	Weblink       string `json:"weblink"`
	Description   string `json:"description"`
	Images        struct {
		Landscape string `json:"landscape"`
	} `json:"images"`
	Video *struct {
		ContentURL string `json:"content_url"`
	} `json:"video"`
}

type RaiPlayPalinsesto struct {
	Events []RaiPlayEvent `json:"events"`
}
