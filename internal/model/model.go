package model

import "time"

type Canale struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Programma struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Image       string `json:"image,omitempty"`
	Description string `json:"description,omitempty"`
}

type Qualita struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type ProgrammaRSS struct {
	Name   string `json:"name"`
	Orario string `json:"orario"`
	URL    string `json:"url"`
}

// Internal structures for RaiPlay API response parsing

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

type ProgrammaCached struct {
	Programmi []RaiPlayEvent `bson:"programmi"`
	CreatedAt time.Time      `bson:"createdAt"`
}
