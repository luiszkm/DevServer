package player_test

import (
	"testing"

	"devserver/api/internal/player"
)

// Own-layer table for the dev name rule (Test policy: decides, reached across a boundary).
func TestNormalizeDevName(t *testing.T) {
	cases := []struct {
		in, out string
		ok      bool
	}{
		{"AB", "AB", false},
		{"ABC", "ABC", true},
		{"ABCDEFGHIJKLMNOP", "ABCDEFGHIJKLMNOP", true},
		{"ABCDEFGHIJKLMNOPQ", "ABCDEFGHIJKLMNOPQ", false},
		{"DEV-01", "DEV-01", false},
		{"DÉV_01", "DÉV_01", false},
		{"", "", false},
		{"dev_01", "DEV_01", true},
		{"dev 01", "DEV 01", false},
	}
	for _, tc := range cases {
		out, ok := player.NormalizeDevName(tc.in)
		if out != tc.out || ok != tc.ok {
			t.Errorf("NormalizeDevName(%q) = %q, %v; want %q, %v", tc.in, out, ok, tc.out, tc.ok)
		}
	}
}
