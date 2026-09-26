package battle_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"sort"
	"sync"
	"testing"

	"devserver/api/internal/apptest"
)

func powerOf(t *testing.T, rec *httptest.ResponseRecorder) int {
	t.Helper()
	var b struct {
		Player struct {
			Power *int `json:"power"`
		} `json:"player"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &b); err != nil || b.Player.Power == nil {
		t.Fatalf("player.power missing: %s", rec.Body.String())
	}
	return *b.Player.Power
}

func classFixture(t *testing.T, class string) *fixture {
	env := apptest.New(t)
	return &fixture{t, env, env.NewPlayer(1, "DEV_01", class)}
}

func (f *fixture) skill(id, action string) {
	f.t.Helper()
	if rec := f.do(http.MethodPost, "/api/me/skills/"+id+"/"+action, nil); rec.Code != 200 {
		f.t.Fatalf("%s %s: %d %s", action, id, rec.Code, rec.Body.String())
	}
}

// skill-loadout AC 13: a skill command needs the skill in the loadout, not only unlocked.
func TestCommand_NeedsEquippedSkill(t *testing.T) {
	f := newFixture(t)
	f.unlock("be1", "be2", "be3", "be4", "be5")
	f.start()
	before := f.snapshot()
	rec := f.cmd("be5")
	f.status(rec, http.StatusConflict, "command_locked")
	var body struct {
		Error struct{ Message string } `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || body.Error.Message != "equipe a skill para usar este comando" {
		t.Fatalf("message = %s", rec.Body.String())
	}
	if f.snapshot() != before {
		t.Fatal("a locked command changed the player or the battle")
	}
	f.skill("be1", "unequip")
	f.skill("be5", "equip")
	f.turn(f.cmd("be5"))
	f.status(f.cmd("be1"), http.StatusConflict, "command_locked")
}

// skill-loadout AC 14: the command plays at its level's scale, before the damage bonus.
func TestCommand_ScalesWithLevel(t *testing.T) {
	f := classFixture(t, "FRONTEND")
	f.unlock("fe1")
	f.sql(`UPDATE player_skills SET level = 3`)
	f.sql(`UPDATE players SET hp = 50`)
	f.start()
	got := f.turn(f.cmd("fe1"))
	if got.Events[0].Type != "heal" || got.Events[0].Amount != 39 {
		t.Fatalf("fe1 level 3: %+v, want heal 39 (26 × 1.5)", got.Events[0])
	}
	if got.Player.HP != 82 {
		t.Fatalf("hp = %d, want 82 (50 + 39 - 7)", got.Player.HP)
	}

	f = newFixture(t)
	f.unlock("be1")
	f.sql(`UPDATE player_skills SET level = 2`)
	f.start()
	if e := f.turn(f.cmd("be1")).Events[0]; e.Type != "damage" || e.Amount != 26 {
		t.Fatalf("be1 level 2, base 23: %+v, want 26 (23 × 1.12)", e)
	}
	f.sql(`UPDATE player_skills SET level = 1`)
	f.env.Rand.Push(6)
	if e := f.turn(f.cmd("be1")).Events[0]; e.Type != "damage" || e.Amount != 26 {
		t.Fatalf("be1 level 1, base 24: %+v, want 26 (24 × 1.08)", e)
	}
}

// skill-loadout AC 15: only the loadout gives passives; unequipping drops the SP of the next fight.
func TestStart_SPMaxFromLoadoutOnly(t *testing.T) {
	f := classFixture(t, "FRONTEND")
	f.unlock("fe1", "fe2", "fe3")
	if got := f.start().Battle.SPMax; got != 70 {
		t.Fatalf("spMax = %d, want 70 (50 + 8 + 12)", got)
	}
	f.skill("fe3", "unequip")
	f.sql(`UPDATE players SET region = 'floresta'`)
	if got := f.start().Battle.SPMax; got != 63 {
		t.Fatalf("spMax after unequip fe3 = %d, want 63 (55 + 8)", got)
	}
	f.skill("fe3", "equip")
	f.skill("fe1", "upgrade")
	f.sql(`UPDATE players SET region = 'vila'`)
	if got := f.start().Battle.SPMax; got != 74 {
		t.Fatalf("spMax with fe1 level 2 = %d, want 74 (50 + 12 + 12)", got)
	}
}

// limit-break AC 1, 2, 6, 7, 8: the bar charges on hits and survives flight and a new encounter.
func TestPower_ChargesAndSurvives(t *testing.T) {
	f := newFixture(t)
	f.start()
	f.sql(`UPDATE battles SET enemy_hp = 1000, enemy_hp_max = 1000`)
	f.sql(`UPDATE players SET power = 70`)
	steps := []struct {
		cmd  string
		want int
	}{{"fix", 80}, {"test", 80}, {"fix", 100}, {"plain", 100}}
	for _, s := range steps {
		f.sql(`UPDATE battles SET sp = 50`)
		if got := powerOf(t, f.cmd(s.cmd)); got != s.want {
			t.Fatalf("after %s: power %d, want %d", s.cmd, got, s.want)
		}
	}
	f.sql(`UPDATE players SET power = 40`)
	if got := powerOf(t, f.item("sp_potion")); got != 40 {
		t.Fatalf("potion: power %d, want 40", got)
	}
	if got := powerOf(t, f.cmd("rollback")); got != 40 {
		t.Fatalf("rollback: power %d, want 40", got)
	}
	if got := powerOf(t, f.do(http.MethodPost, "/api/me/battle", nil)); got != 40 {
		t.Fatalf("new encounter: power %d, want 40", got)
	}
	f.sql(`UPDATE battles SET enemy_hp = 1`)
	if got := powerOf(t, f.cmd("fix")); got != 50 {
		t.Fatalf("winning hit: power %d, want 50", got)
	}
}

// limit-break AC 9: power sent by the client is ignored.
func TestPower_IgnoresClientValue(t *testing.T) {
	f := newFixture(t)
	f.start()
	rec := f.do(http.MethodPost, "/api/me/battle/commands", map[string]any{"command": "fix", "power": 100, "damage": 999})
	if got := powerOf(t, rec); got != 10 {
		t.Fatalf("power = %d, want 10", got)
	}
}

// limit-break AC 13, 14, 18: SHIP IT spends the full bar, hits 80, and the enemy still counters.
func TestShip_SpendsBar(t *testing.T) {
	f := newFixture(t)
	f.sql(`UPDATE players SET region = 'mercado', power = 100`)
	f.start()
	f.sql(`UPDATE battles SET sp = 0`)
	rec := f.cmd("ship")
	got := f.turn(rec)
	if powerOf(t, rec) != 0 {
		t.Fatalf("power after ship = %d, want 0", powerOf(t, rec))
	}
	want := []eventJSON{{Type: "damage", Command: "ship", Amount: 80}, {Type: "counter", Amount: 7}}
	if !reflect.DeepEqual(got.Events, want) {
		t.Fatalf("events = %+v, want %+v", got.Events, want)
	}
	if got.Battle.EnemyHP != 5 {
		t.Fatalf("enemy hp = %d, want 5", got.Battle.EnemyHP)
	}
	f.status(f.cmd("ship"), http.StatusConflict, "power_not_ready")
}

// limit-break AC 15: a killing SHIP IT wins without a counter and leaves the bar empty.
func TestShip_Victory(t *testing.T) {
	f := newFixture(t)
	f.sql(`UPDATE players SET power = 100`)
	f.start()
	rec := f.cmd("ship")
	got := f.turn(rec)
	if types(got.Events)[0] != "damage" || types(got.Events)[1] != "victory" || powerOf(t, rec) != 0 {
		t.Fatalf("events %v power %d, want damage, victory and power 0", types(got.Events), powerOf(t, rec))
	}
	for _, e := range got.Events {
		if e.Type == "counter" {
			t.Fatal("a won turn has a counter")
		}
	}
}

// limit-break AC 17: 99 is not full; nothing changes.
func TestShip_NotReady(t *testing.T) {
	f := newFixture(t)
	f.sql(`UPDATE players SET power = 99`)
	f.start()
	before := f.snapshot()
	rec := f.cmd("ship")
	f.status(rec, http.StatusConflict, "power_not_ready")
	var body struct {
		Error struct{ Message string } `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || body.Error.Message != "a barra de poder ainda não encheu" {
		t.Fatalf("message = %s", rec.Body.String())
	}
	if f.snapshot() != before {
		t.Fatal("a refused ship changed the player or the battle")
	}
}

// skill-loadout AC 17: another class's special is locked, even with a full bar; class wins over power.
func TestSpecial_OtherClassLocked(t *testing.T) {
	f := newFixture(t)
	f.start()
	for _, id := range []string{"hot_reload", "zero_downtime", "monolito"} {
		f.status(f.cmd(id), http.StatusConflict, "command_locked")
	}
	f.sql(`UPDATE players SET power = 100`)
	before := f.snapshot()
	for _, id := range []string{"hot_reload", "zero_downtime", "monolito"} {
		f.status(f.cmd(id), http.StatusConflict, "command_locked")
	}
	if f.snapshot() != before {
		t.Fatal("a locked special changed the player or the battle")
	}
}

// skill-loadout AC 2, 17: each class plays its own special from a full bar.
func TestSpecial_EachClass(t *testing.T) {
	for _, tc := range []struct {
		class, cmd string
		events     []eventJSON
		hp, sp     int
	}{
		{"FRONTEND", "hot_reload", []eventJSON{{Type: "damage", Command: "hot_reload", Amount: 40}, {Type: "heal", Amount: 60}, {Type: "sp", Amount: 50}, {Type: "counter", Amount: 7}}, 73, 50},
		{"BACKEND", "ship", []eventJSON{{Type: "damage", Command: "ship", Amount: 80}, {Type: "counter", Amount: 7}}, 13, 5},
		{"DEVOPS", "zero_downtime", []eventJSON{{Type: "damage", Command: "zero_downtime", Amount: 50}, {Type: "heal", Amount: 60}, {Type: "shield"}, {Type: "counter", Amount: 4, Blocked: true}}, 76, 5},
		{"FULLSTACK", "monolito", []eventJSON{{Type: "damage", Command: "monolito", Amount: 60}, {Type: "heal", Amount: 30}, {Type: "counter", Amount: 7}}, 43, 5},
	} {
		f := classFixture(t, tc.class)
		f.sql(`UPDATE players SET power = 100, hp = 20`)
		f.start()
		f.sql(`UPDATE battles SET enemy_hp = 1000, enemy_hp_max = 1000, sp = 0`)
		rec := f.cmd(tc.cmd)
		got := f.turn(rec)
		if !reflect.DeepEqual(got.Events, tc.events) || got.Player.HP != tc.hp || got.Battle.SP != tc.sp || powerOf(t, rec) != 0 {
			t.Errorf("%s %s: events %+v hp %d sp %d power %d, want %+v hp %d sp %d power 0",
				tc.class, tc.cmd, got.Events, got.Player.HP, got.Battle.SP, powerOf(t, rec), tc.events, tc.hp, tc.sp)
		}
	}
}

// limit-break AC 19: two SHIP IT at once spend the bar once.
func TestShip_ConcurrentOnce(t *testing.T) {
	f := newFixture(t)
	f.sql(`UPDATE players SET power = 100`)
	f.start()
	f.sql(`UPDATE battles SET enemy_hp = 1000, enemy_hp_max = 1000`)
	var wg sync.WaitGroup
	gate := make(chan struct{})
	out := make([]string, 2)
	for i := range out {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-gate
			rec := f.cmd("ship")
			out[i] = fmt.Sprint(rec.Code)
			if rec.Code >= 400 {
				out[i] += " " + apptest.ErrorCode(t, rec)
			}
		}(i)
	}
	close(gate)
	wg.Wait()
	sort.Strings(out)
	if !reflect.DeepEqual(out, []string{"200", "409 power_not_ready"}) {
		t.Fatalf("results %v, want one 200 and one 409 power_not_ready", out)
	}
}

// limit-break AC 20: a turn whose write fails leaves the bar as it was.
func TestShip_WriteErrorKeepsPower(t *testing.T) {
	f := newFixture(t)
	f.sql(`UPDATE players SET power = 100`)
	f.start()
	f.sql(`UPDATE battles SET enemy_hp = 1000`)
	f.sql(`CREATE FUNCTION reject_battle() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'nope'; END $$`)
	f.sql(`CREATE TRIGGER reject_battle BEFORE UPDATE ON battles FOR EACH ROW EXECUTE FUNCTION reject_battle()`)
	f.status(f.cmd("ship"), http.StatusInternalServerError, "internal")
	if got := powerOf(t, f.do(http.MethodGet, "/api/me", nil)); got != 100 {
		t.Fatalf("power after a failed turn = %d, want 100", got)
	}
}
