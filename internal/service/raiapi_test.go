package service

import (
	"context"
	"slices"
	"testing"
)

func TestListCanali(t *testing.T) {
	s, _ := NewRaiApiService(DefaultBaseURL)
	canaliIter := s.ListCanali(context.Background())
	canali := slices.Collect(canaliIter)

	if len(canali) != 14 {
		t.Errorf("Expected 14 canali, got %d", len(canali))
	}

	if canali[0].Name != "Rai1" {
		t.Errorf("Expected Rai1, got %s", canali[0].Name)
	}
}
