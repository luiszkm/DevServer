package battle_test

import (
	"fmt"
	"reflect"
	"testing"

	"devserver/api/internal/battle"
	"devserver/api/internal/catalog"
	"devserver/api/internal/player"
)

// skill-loadout AC 14 (own layer): both damage bounds, heal and SP gain, rounded; the catalog is untouched.
func TestRules_Scaled(t *testing.T) {
	c := catalog.Default()
	fe8, _ := c.Command("fe8")
	be1, _ := c.Command("be1")
	for _, tc := range []struct {
		name  string
		cmd   catalog.Command
		scale int
		dmg   []int
		heal  int
		sp    int
	}{
		{"be1 at 100", be1, 100, []int{18, 24}, 0, 0},
		{"be1 at 125 rounds 22.5 up", be1, 125, []int{23, 30}, 0, 0},
		{"be1 at 150", be1, 150, []int{27, 36}, 0, 0},
		{"fe8 at 125", fe8, 125, nil, 56, 15},
		{"fe8 at 150", fe8, 150, nil, 68, 18},
	} {
		got := battle.Scaled(tc.cmd, tc.scale)
		if fmt.Sprint(got.Damage) != fmt.Sprint(tc.dmg) || got.Heal != tc.heal || got.SPGain != tc.sp || got.Cost != tc.cmd.Cost {
			t.Errorf("%s: damage %v heal %d sp %d cost %d, want %v %d %d %d", tc.name, got.Damage, got.Heal, got.SPGain, got.Cost, tc.dmg, tc.heal, tc.sp, tc.cmd.Cost)
		}
	}
	if again, _ := c.Command("be1"); !reflect.DeepEqual(again.Damage, []int{18, 24}) {
		t.Fatalf("catalog be1 damage = %v after Scaled, want [18 24]", again.Damage)
	}
}

// limit-break AC 1–7 (own layer): a hit adds perHit, a crit perCrit, capped at max; other commands
// leave the bar; a limit command empties it before its hit and does not refill it.
func TestRules_PowerCharge(t *testing.T) {
	c := catalog.Default()
	cmd := func(id string) catalog.Command { x, _ := c.Command(id); return x }
	for _, tc := range []struct {
		name   string
		cmd    catalog.Command
		weak   bool
		before int
		after  int
	}{
		{"fix hit", cmd("fix"), false, 0, 10},
		{"fix crit", cmd("fix"), true, 0, 20},
		{"90 + hit", cmd("fix"), false, 90, 100},
		{"90 + crit", cmd("fix"), true, 90, 100},
		{"100 + hit", cmd("fix"), false, 100, 100},
		{"skill hit", cmd("be1"), false, 40, 50},
		{"test", cmd("test"), false, 40, 40},
		{"refactor", cmd("refactor"), false, 40, 40},
		{"plain", cmd("plain"), false, 40, 40},
		{"heal skill", cmd("fe1"), false, 40, 40},
		{"ship empties the bar", cmd("ship"), false, 100, 0},
		{"ship crit does not refill", cmd("ship"), true, 100, 0},
	} {
		p := &player.Player{HP: 100, HPMax: 100, XPMax: 500, Power: tc.before}
		st := &battle.State{EnemyHP: 500, SP: 50, SPMax: 50, Weak: tc.weak}
		battle.ApplyCommand(st, p, tc.cmd, rules(0), &seq{})
		if p.Power != tc.after {
			t.Errorf("%s: power %d -> %d, want %d", tc.name, tc.before, p.Power, tc.after)
		}
	}
}
