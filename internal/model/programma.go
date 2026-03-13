package model

import "time"

type Programma struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Image       string `json:"image"`
	Description string `json:"description"`
}

type ProgrammaCached struct {
	Programmi []RaiPlayEvent `bson:"programmi"`
	CreatedAt time.Time      `bson:"createdAt"`
}
