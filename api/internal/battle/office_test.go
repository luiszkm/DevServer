package battle_test

import (
	"testing"

	"devserver/api/internal/battle"
	"devserver/api/internal/player"
)

func (f *fixture) furnish(placed ...[3]any) {
	f.t.Helper()
	for _, p := range placed {
		f.sql(`INSERT INTO player_office (player_id, zone, position, furniture_id) SELECT id, $1, $2, $3 FROM players`, p[0], p[1], p[2])
	}
}

// C25 (office, boundary)
func TestTurn_OfficeSPRegen(t *testing.T) {
	f := newFixture(t)
	f.furnish([3]any{"piso", 0, "cadeira_gamer"}, [3]any{"piso", 1, "cafeteira"})
	f.start()
	f.env.Rand.Push(6, 0)
	if got := f.turn(f.cmd("fix")); got.Battle.SP != 48 || got.Player.HP <= 0 {
		t.Fatalf("fix with office: sp %d hp %d, want 48 (40 + 5 + 3) and alive", got.Battle.SP, got.Player.HP)
	}
	f.sql(`UPDATE battles SET sp = 50`)
	f.env.Rand.Push(0)
	if got := f.turn(f.cmd("plain")); got.Battle.SP != 50 {
		t.Fatalf("plain at max with office: sp %d, want 50", got.Battle.SP)
	}

	g := newFixture(t)
	g.start()
	g.env.Rand.Push(6, 0)
	if got := g.turn(g.cmd("fix")); got.Battle.SP != 45 {
		t.Fatalf("fix without office: sp %d, want 45", got.Battle.SP)
	}
}

// C25 (office, own layer)
func TestEndTurn_SPRegenBonus(t *testing.T) {
	for bonus, want := range map[int]int{0: 25, 3: 28} {
		r := rules(0)
		r.SPRegenBonus = bonus
		st := &battle.State{EnemyHP: 60, SP: 20, SPMax: 50}
		p := &player.Player{HP: 100, HPMax: 100, XPMax: 500}
		battle.EndTurn(st, p, false, r, &seq{})
		if st.SP != want {
			t.Errorf("EndTurn with SPRegenBonus %d: sp %d, want %d", bonus, st.SP, want)
		}
	}
	r := rules(0)
	r.SPRegenBonus = 3
	st := &battle.State{EnemyHP: 60, SP: 45, SPMax: 50}
	battle.EndTurn(st, &player.Player{HP: 100, HPMax: 100, XPMax: 500}, false, r, &seq{})
	if st.SP != 50 {
		t.Errorf("EndTurn near max: sp %d, want 50", st.SP)
	}
}

// C26 (office)
func TestBattle_OfficeLeavesCombatStats(t *testing.T) {
	f := newFixture(t)
	f.furnish(
		[3]any{"piso", 0, "mesa"}, [3]any{"piso", 1, "cadeira_gamer"}, [3]any{"piso", 2, "setup2"},
		[3]any{"piso", 3, "rack"}, [3]any{"piso", 4, "cafeteira"}, [3]any{"piso", 5, "estante"},
		[3]any{"parede", 0, "kanban"},
	)
	st := f.start()
	if st.Battle.SP != 50 || st.Battle.SPMax != 50 || st.Player.HPMax != 100 {
		t.Fatalf("start: sp %d/%d hpMax %d, want 50/50 and 100", st.Battle.SP, st.Battle.SPMax, st.Player.HPMax)
	}
	f.env.Rand.Push(6, 0)
	got := f.turn(f.cmd("fix"))
	if got.Events[0].Type != "damage" || got.Events[0].Amount != 20 {
		t.Fatalf("fix draw 6: events %+v, want damage 20", got.Events)
	}
	f.sql(`UPDATE battles SET enemy_hp = 10`)
	f.sql(`UPDATE players SET xp = 0, coins = 0, gems = 0`)
	f.env.Rand.Push(0, 99, 99)
	got = f.turn(f.cmd("fix"))
	if r := got.Events[len(got.Events)-1]; r.Type != "reward" || r.XP != 90 || r.Coins != 40 || r.Gems != 1 {
		t.Fatalf("victory events %+v, want reward xp 90 coins 40 gems 1", got.Events)
	}
	if got.Player.HPMax != 100 {
		t.Errorf("hpMax = %d, want 100", got.Player.HPMax)
	}
}
