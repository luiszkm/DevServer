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

// C30
func TestGainXP(t *testing.T) {
	base := func() *player.Player {
		return &player.Player{Level: 1, XP: 0, XPMax: 500, HP: 30, HPMax: 100, SkillPoints: 1}
	}
	cases := []struct {
		name                                    string
		gain                                    int
		level, xp, xpMax, hp, hpMax, sp, gained int
	}{
		{"zero", 0, 1, 0, 500, 30, 100, 1, 0},
		{"one below max", 499, 1, 499, 500, 30, 100, 1, 0},
		{"exactly max", 500, 2, 0, 750, 120, 120, 2, 1},
		{"two levels", 500 + 750 + 10, 3, 10, 1000, 140, 140, 3, 2},
	}
	for _, tc := range cases {
		p := base()
		gained := player.GainXP(p, tc.gain)
		got := []int{p.Level, p.XP, p.XPMax, p.HP, p.HPMax, p.SkillPoints, gained}
		want := []int{tc.level, tc.xp, tc.xpMax, tc.hp, tc.hpMax, tc.sp, tc.gained}
		for i := range got {
			if got[i] != want[i] {
				t.Errorf("%s: level,xp,xpMax,hp,hpMax,sp,gained = %v, want %v", tc.name, got, want)
				break
			}
		}
	}
}

// C27 (own layer): SortSkills orders by catalog and keeps ids unknown to the catalog last.
func TestSortSkills(t *testing.T) {
	p := &player.Player{Skills: []string{"i3", "zz", "b1", "f2", "f1"}}
	player.SortSkills(p)
	want := []string{"f1", "f2", "b1", "i3", "zz"}
	for i := range want {
		if p.Skills[i] != want[i] {
			t.Fatalf("SortSkills = %v, want %v", p.Skills, want)
		}
	}
}
