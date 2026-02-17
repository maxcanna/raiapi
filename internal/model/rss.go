package model

import "time"

type ProgrammaRSS struct {
	Name   string `json:"name"`
	Orario string `json:"orario"`
	URL    string `json:"url"`
}

type RSSData struct {
	Canale    string
	Hostname  string
	URL       string
	Today     time.Time
	Programmi []RSSItem
}

type RSSItem struct {
	Name    string
	DateTag string
	URL     string
	PubDate string
}
