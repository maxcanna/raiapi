package model

type RaiPlayImages struct {
	Landscape string `json:"landscape"`
}

type RaiPlayVideo struct {
	ContentURL string `json:"content_url"`
}

type RaiPlayEvent struct {
	HasVideo      bool          `json:"has_video"`
	PathID        string        `json:"path_id"`
	Name          string        `json:"name"`
	TimePublished string        `json:"time_published"`
	Weblink       string        `json:"weblink"`
	Description   string        `json:"description"`
	Images        RaiPlayImages `json:"images"`
	Video         *RaiPlayVideo `json:"video"`
}

type RaiPlayPalinsesto struct {
	Events []RaiPlayEvent `json:"events"`
}
