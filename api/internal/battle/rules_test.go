package battle_test

import (
	"testing"

	"devserver/api/internal/battle"
	"devserver/api/internal/catalog"
	"devserver/api/internal/player"
)

type seq []int

func (s *seq) IntN(n int) int {
	if len(*s) == 0 {
		return 0
	}
	v := (*s)[0]
	*s = (*s)[1:]
	return v
}

func rules(bonus int) battle.Rules {
	c := catalog.Default()
	e, _ := c.Enemy("vila")
	return battle.Rules{Combat: c.Combat, Enemy: e, DamageBonus: bonus}
}

// C25
func TestRules_WeaknessRounding(t *testing.T) {
	for base, want := range map[int]int{14: 25, 15: 27, 17: 31, 20: 36} {
		st := &battle.State{Weak: true}
		if dmg, used := battle.Hit(st, base, rules(0)); dmg != want || !used || st.Weak {
			t.Errorf("Hit(%d, weak) = %d used %v weak after %v, want %d, true, false", base, dmg, used, st.Weak, want)
		}
	}
	st := &battle.State{}
	if dmg, used := battle.Hit(st, 14, rules(0)); dmg != 14 || used {
		t.Errorf("Hit without weakness = %d %v", dmg, used)
	}
}

// C25
func TestRules_DamageBonusRounding(t *testing.T) {
	for _, tc := range []struct{ base, bonus, want int }{{25, 10, 28}, {20, 10, 22}, {14, 37, 19}, {20, 0, 20}} {
		st := &battle.State{}
		if dmg, _ := battle.Hit(st, tc.base, rules(tc.bonus)); dmg != tc.want {
			t.Errorf("Hit(%d, +%d%%) = %d, want %d", tc.base, tc.bonus, dmg, tc.want)
		}
	}
}

// C25
func TestRules_ShieldRounding(t *testing.T) {
	for in, want := range map[int]int{7: 4, 8: 4, 13: 7, 14: 7} {
		if got := battle.Shielded(in); got != want {
			t.Errorf("Shielded(%d) = %d, want %d", in, got, want)
		}
	}
}

// C25
func TestRules_SPBounds(t *testing.T) {
	c := catalog.Default()
	fix, _ := c.Command("fix")
	plain, _ := c.Command("plain")
	p := &player.Player{HP: 100, HPMax: 100, XPMax: 500}
	st := &battle.State{EnemyHP: 60, SP: 50, SPMax: 50}
	battle.ApplyCommand(st, p, plain, rules(0), &seq{})
	if st.SP != 50 {
		t.Errorf("plain at max: sp %d, want 50", st.SP)
	}
	st.SP = 10
	battle.ApplyCommand(st, p, fix, rules(0), &seq{})
	if st.SP != 5 {
		t.Errorf("fix with exactly the cost: sp %d, want 0 + 5 regen", st.SP)
	}
	st.SP = 3
	battle.ApplyCommand(st, p, fix, rules(0), &seq{})
	if st.SP < 0 {
		t.Errorf("sp went negative: %d", st.SP)
	}
	// A defeat skips the regeneration, so PLAIN's own +3 must already respect the maximum.
	st = &battle.State{EnemyHP: 60, SP: 49, SPMax: 50}
	p.HP = 1
	if out := battle.ApplyCommand(st, p, plain, rules(0), &seq{}); !out.Defeated || st.SP != 50 {
		t.Errorf("plain then defeat: defeated %v sp %d, want true and 50", out.Defeated, st.SP)
	}
}
