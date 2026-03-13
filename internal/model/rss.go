package model

import (
	"encoding/xml"
	"time"
)

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

// Structs matching RSS XML Schema for validation and generation

type RSS struct {
	XMLName xml.Name   `xml:"rss"`
	Version string     `xml:"version,attr"`
	Channel RSSChannel `xml:"channel"`
}

type RSSChannel struct {
	Title       string    `xml:"title"`
	Description string    `xml:"description"`
	Generator   string    `xml:"generator"`
	Link        string    `xml:"link"`
	Items       []RSSItem `xml:"item"`
}

type RSSItem struct {
	Title       string `xml:"title"`
	Description string `xml:"description"`
	Link        string `xml:"link"`
	Guid        string `xml:"guid"`
	PubDate     string `xml:"pubDate"`

	// Internal fields for template rendering
	Name    string `xml:"-"`
	DateTag string `xml:"-"`
	URL     string `xml:"-"`
}
