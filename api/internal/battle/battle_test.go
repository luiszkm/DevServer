package battle_test

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"

	"devserver/api/internal/apptest"
	"devserver/api/internal/catalog"
	"devserver/api/internal/db"
	"devserver/api/internal/httpx"
)

type battleJSON struct {
	Region     string `json:"region"`
	EnemyHP    int    `json:"enemyHp"`
	EnemyHPMax int    `json:"enemyHpMax"`
	SP         int    `json:"sp"`
	SPMax      int    `json:"spMax"`
	Weakness   bool   `json:"weakness"`
	Status     string `json:"status"`
}

type eventJSON struct {
	Type         string `json:"type"`
	Command      string `json:"command"`
	Item         string `json:"item"`
	Stat         string `json:"stat"`
	Amount       int    `json:"amount"`
	Weakness     bool   `json:"weakness"`
	Blocked      bool   `json:"blocked"`
	XP           int    `json:"xp"`
	Coins        int    `json:"coins"`
	Gems         int    `json:"gems"`
	LevelsGained int    `json:"levelsGained"`
}

type turnJSON struct {
	Battle *battleJSON `json:"battle"`
	Player struct {
		HP, HPMax, XP, XPMax, Level, Coins, Gems int
		Region                                   string
		Inventory                                []struct {
			Item     string `json:"item"`
			Quantity int    `json:"quantity"`
		}
	} `json:"player"`
	Events []eventJSON `json:"events"`
}

type fixture struct {
	t   *testing.T
	env *apptest.Env
	c   *http.Cookie
}

func newFixture(t *testing.T) *fixture {
	env := apptest.New(t)
	return &fixture{t, env, env.NewPlayer(1, "DEV_01", "BACKEND")}
}

func (f *fixture) sql(q string, args ...any) {
	f.t.Helper()
	if _, err := f.env.Pool.Exec(context.Background(), q, args...); err != nil {
		f.t.Fatalf("%s: %v", q, err)
	}
}

func (f *fixture) unlock(ids ...string) {
	f.t.Helper()
	f.sql(`UPDATE players SET skill_points = 99`)
	for _, id := range ids {
		if rec := f.env.Do(http.MethodPost, "/api/me/skills/"+id+"/unlock", nil, f.c); rec.Code != 200 {
			f.t.Fatalf("unlock %s: %d %s", id, rec.Code, rec.Body.String())
		}
	}
}

func (f *fixture) do(method, path string, body any) *httptest.ResponseRecorder {
	return f.env.Do(method, path, body, f.c)
}

func (f *fixture) start() turnJSON {
	f.t.Helper()
	rec := f.do(http.MethodPost, "/api/me/battle", nil)
	if rec.Code != 200 {
		f.t.Fatalf("start: %d %s", rec.Code, rec.Body.String())
	}
	return apptest.Decode[turnJSON](f.t, rec)
}

func (f *fixture) cmd(id string) *httptest.ResponseRecorder {
	return f.do(http.MethodPost, "/api/me/battle/commands", map[string]string{"command": id})
}

func (f *fixture) item(id string) *httptest.ResponseRecorder {
	return f.do(http.MethodPost, "/api/me/battle/items", map[string]string{"item": id})
}

func (f *fixture) turn(rec *httptest.ResponseRecorder) turnJSON {
	f.t.Helper()
	if rec.Code != 200 {
		f.t.Fatalf("turn: %d %s", rec.Code, rec.Body.String())
	}
	return apptest.Decode[turnJSON](f.t, rec)
}

func (f *fixture) status(rec *httptest.ResponseRecorder, status int, code string) {
	f.t.Helper()
	if rec.Code != status || apptest.ErrorCode(f.t, rec) != code {
		f.t.Fatalf("got %d %s, want %d %s", rec.Code, rec.Body.String(), status, code)
	}
}

func (f *fixture) snapshot() string {
	f.t.Helper()
	var s string
	if err := f.env.Pool.QueryRow(context.Background(),
		`SELECT (SELECT row_to_json(p)::text FROM players p) || (SELECT coalesce(row_to_json(b)::text, '') FROM battles b)`).Scan(&s); err != nil {
		f.t.Fatal(err)
	}
	return s
}

func types(evs []eventJSON) []string {
	out := []string{}
	for _, e := range evs {
		out = append(out, e.Type)
	}
	return out
}

// C1
func TestStart_CreatesBattle(t *testing.T) {
	f := newFixture(t)
	got := f.start()
	want := battleJSON{Region: "vila", EnemyHP: 60, EnemyHPMax: 60, SP: 50, SPMax: 50, Status: "active"}
	if got.Battle == nil || *got.Battle != want {
		t.Fatalf("battle = %+v, want %+v", got.Battle, want)
	}
	if got.Player.HPMax != 100 {
		t.Fatalf("player missing: %+v", got.Player)
	}
}

// C2
func TestStart_ResumesActiveBattle(t *testing.T) {
	f := newFixture(t)
	f.start()
	f.env.Rand.Push(6, 0)
	f.turn(f.cmd("fix"))
	got := f.start()
	if got.Battle.EnemyHP != 40 || got.Battle.EnemyHPMax != 60 {
		t.Fatalf("resumed battle = %+v, want enemy 40/60", got.Battle)
	}
}

// C3
func TestStart_ReplacesOtherRegionOrWonBattle(t *testing.T) {
	f := newFixture(t)
	f.start()
	f.sql(`UPDATE players SET region = 'floresta'`)
	got := f.start()
	if got.Battle.Region != "floresta" || got.Battle.EnemyHP != 70 || got.Battle.EnemyHPMax != 70 {
		t.Fatalf("after travel = %+v, want floresta 70/70", got.Battle)
	}
	f.sql(`UPDATE battles SET enemy_hp = 5`)
	f.turn(f.cmd("fix"))
	got = f.start()
	if got.Battle.Status != "active" || got.Battle.EnemyHP != 70 {
		t.Fatalf("after victory = %+v, want a fresh active enemy", got.Battle)
	}
}

// C4
func TestStart_SPMaxIncludesSkillBonus(t *testing.T) {
	for _, tc := range []struct {
		skills []string
		spMax  int
	}{{nil, 55}, {[]string{"f1", "f2"}, 63}, {[]string{"f1", "f2", "b1", "b2", "i1"}, 81}} {
		f := newFixture(t)
		f.unlock(tc.skills...)
		f.sql(`UPDATE players SET region = 'floresta'`)
		if got := f.start().Battle; got.SPMax != tc.spMax || got.SP != tc.spMax {
			t.Errorf("skills %v: sp %d/%d, want %d/%d", tc.skills, got.SP, got.SPMax, tc.spMax, tc.spMax)
		}
	}
}

// C5
func TestGet_CurrentOrNotFound(t *testing.T) {
	f := newFixture(t)
	f.status(f.do(http.MethodGet, "/api/me/battle", nil), 404, "battle_not_found")
	f.start()
	rec := f.do(http.MethodGet, "/api/me/battle", nil)
	if rec.Code != 200 {
		t.Fatalf("GET: %d", rec.Code)
	}
	if b := apptest.Decode[turnJSON](t, rec).Battle; b == nil || b.EnemyHP != 60 {
		t.Fatalf("GET battle = %+v", b)
	}
}

// C6
func TestStart_EveryRegionEnemy(t *testing.T) {
	f := newFixture(t)
	for region, hpsp := range map[string][2]int{"vila": {60, 50}, "floresta": {70, 55}, "mercado": {85, 60}, "caverna": {110, 70}, "torre": {160, 85}, "nuvem": {220, 100}} {
		f.sql(`UPDATE players SET region = $1`, region)
		b := f.start().Battle
		if b.Region != region || b.EnemyHP != hpsp[0] || b.EnemyHPMax != hpsp[0] || b.SPMax != hpsp[1] {
			t.Errorf("%s: %+v, want hp %d sp %d", region, b, hpsp[0], hpsp[1])
		}
	}
}

// C7
func TestCommand_DamageCostCounterRegen(t *testing.T) {
	f := newFixture(t)
	f.start()
	f.env.Rand.Push(6, 0)
	got := f.turn(f.cmd("fix"))
	if got.Battle.EnemyHP != 40 || got.Battle.SP != 45 || got.Player.HP != 93 {
		t.Fatalf("enemy %d sp %d hp %d, want 40 45 93", got.Battle.EnemyHP, got.Battle.SP, got.Player.HP)
	}
}

// C8
func TestCommand_WeaknessMultipliesOnce(t *testing.T) {
	f := newFixture(t)
	f.start()
	f.turn(f.cmd("test"))
	f.env.Rand.Push(6, 0)
	got := f.turn(f.cmd("fix"))
	if e := got.Events[0]; e.Type != "damage" || e.Amount != 36 || !e.Weakness {
		t.Fatalf("crit = %+v, want damage 36 with weakness", e)
	}
	f.env.Rand.Push(6, 0)
	got = f.turn(f.cmd("fix"))
	if e := got.Events[0]; e.Amount != 20 || e.Weakness {
		t.Fatalf("next hit = %+v, want 20 without weakness", e)
	}
}

// C9
func TestCommand_DamageBonusFromSkills(t *testing.T) {
	f := newFixture(t)
	f.unlock("f1", "f2", "f3")
	f.sql(`UPDATE players SET hp = 1000, hp_max = 1000`)
	f.start()
	f.sql(`UPDATE battles SET enemy_hp = 500, enemy_hp_max = 500, sp = 999, sp_max = 999`)
	f.env.Rand.Push(6, 0)
	if e := f.turn(f.cmd("fix")).Events[0]; e.Amount != 22 {
		t.Fatalf("fix with 10%% bonus = %d, want 22", e.Amount)
	}
	f.turn(f.cmd("test"))
	f.env.Rand.Push(6, 0)
	if e := f.turn(f.cmd("fix")).Events[0]; e.Amount != 40 {
		t.Fatalf("fix with weakness and 10%% bonus = %d, want 40", e.Amount)
	}
}

// C10
func TestCommand_HealCapped(t *testing.T) {
	f := newFixture(t)
	f.start()
	f.sql(`UPDATE players SET hp = 50`)
	f.env.Rand.Push(0)
	if got := f.turn(f.cmd("refactor")); got.Player.HP != 50+18-7 {
		t.Fatalf("hp = %d, want 61 (50 + 18 - 7)", got.Player.HP)
	}
	f.sql(`UPDATE players SET hp = 95`)
	f.env.Rand.Push(0)
	if got := f.turn(f.cmd("refactor")); got.Player.HP != 100-7 {
		t.Fatalf("hp = %d, want 93 (capped at 100, then -7)", got.Player.HP)
	}
}

// C11
func TestCommand_ShieldHalvesOneCounter(t *testing.T) {
	f := newFixture(t)
	f.start()
	for draw, want := range map[int]int{7: 7, 6: 7} {
		f.env.Rand.Push(draw)
		got := f.turn(f.cmd("plain"))
		c := got.Events[len(got.Events)-1]
		if c.Type != "counter" || c.Amount != want || !c.Blocked {
			t.Fatalf("counter %d under shield = %+v, want %d blocked", 7+draw, c, want)
		}
	}
	f.env.Rand.Push(0, 7)
	got := f.turn(f.cmd("fix"))
	if c := got.Events[len(got.Events)-1]; c.Amount != 14 || c.Blocked {
		t.Fatalf("counter after shield turn = %+v, want 14 unblocked", c)
	}
}

// C12
func TestCommand_PlainRestoresSPCapped(t *testing.T) {
	f := newFixture(t)
	f.start()
	f.sql(`UPDATE battles SET sp = 40`)
	got := f.turn(f.cmd("plain"))
	if got.Events[1].Type != "sp" || got.Events[1].Amount != 3 || got.Battle.SP != 48 {
		t.Fatalf("events %v sp %d, want sp event +3 and 48", types(got.Events), got.Battle.SP)
	}
	f.sql(`UPDATE battles SET sp = 49`)
	if got := f.turn(f.cmd("plain")); got.Battle.SP != 50 {
		t.Fatalf("sp = %d, want 50 (capped)", got.Battle.SP)
	}
}

// C13
func TestCommand_CounterRange(t *testing.T) {
	f := newFixture(t)
	f.start()
	for draw, want := range map[int]int{0: 7, 7: 14} {
		f.sql(`UPDATE players SET hp = 100`)
		f.env.Rand.Push(0, draw)
		got := f.turn(f.cmd("fix"))
		if c := got.Events[1]; c.Amount != want || got.Player.HP != 100-want {
			t.Fatalf("draw %d: counter %d hp %d, want %d", draw, c.Amount, got.Player.HP, want)
		}
	}
	f.sql(`UPDATE battles SET sp = 48`)
	if got := f.turn(f.cmd("plain")); got.Battle.SP != 50 {
		t.Fatalf("regen sp = %d, want 50 (capped)", got.Battle.SP)
	}
}

// C14
func TestCommand_EventsInOrder(t *testing.T) {
	f := newFixture(t)
	f.start()
	f.sql(`UPDATE players SET hp = 50`)
	want := map[string][]string{
		"fix":      {"damage", "counter"},
		"test":     {"weakness", "counter"},
		"plain":    {"shield", "sp", "counter"},
		"refactor": {"heal", "counter"},
	}
	for _, id := range []string{"fix", "test", "plain", "refactor"} {
		f.sql(`UPDATE battles SET sp = 50, enemy_hp = 60, weak = false`)
		got := f.turn(f.cmd(id))
		if !reflect.DeepEqual(types(got.Events), want[id]) {
			t.Errorf("%s events = %v, want %v", id, types(got.Events), want[id])
		}
		if id == "fix" && (got.Events[0].Command != "fix" || got.Events[0].Amount != 14) {
			t.Errorf("fix damage event = %+v", got.Events[0])
		}
		if id == "refactor" && got.Events[0].Amount != 18 {
			t.Errorf("heal event = %+v", got.Events[0])
		}
		if c := got.Events[len(got.Events)-1]; c.Amount != map[bool]int{true: 4, false: 7}[id == "plain"] {
			t.Errorf("%s counter = %+v", id, c)
		}
	}
}

// C15
func TestCommand_NotEnoughSP(t *testing.T) {
	f := newFixture(t)
	f.start()
	for _, sp := range []int{5, 9} {
		f.sql(`UPDATE battles SET sp = $1`, sp)
		before := f.snapshot()
		f.status(f.cmd("fix"), 409, "not_enough_sp")
		if after := f.snapshot(); after != before {
			t.Fatalf("sp %d: state changed:\n%s\n%s", sp, before, after)
		}
	}
	f.sql(`UPDATE battles SET sp = 10`)
	if got := f.turn(f.cmd("fix")); got.Battle.SP != 5 {
		t.Fatalf("fix with exactly 10 SP: sp %d, want 0 + 5", got.Battle.SP)
	}
}

// C16
func TestCommand_SkillCommandNeedsSkill(t *testing.T) {
	f := newFixture(t)
	f.start()
	f.status(f.cmd("f1"), 409, "command_locked")
	f.unlock("f1")
	f.turn(f.cmd("f1"))
}

// C17
func TestCommand_Unknown(t *testing.T) {
	f := newFixture(t)
	f.start()
	f.status(f.cmd("hadouken"), 422, "unknown_command")
}

// C18
func TestTurn_NoBattle(t *testing.T) {
	f := newFixture(t)
	f.status(f.cmd("fix"), 404, "battle_not_found")
	f.status(f.item("sp_potion"), 404, "battle_not_found")
}

// C19
func TestTurn_BattleOver(t *testing.T) {
	f := newFixture(t)
	f.start()
	f.sql(`UPDATE battles SET enemy_hp = 1`)
	f.turn(f.cmd("fix"))
	f.status(f.cmd("fix"), 409, "battle_over")
	f.status(f.item("sp_potion"), 409, "battle_over")
}

// C20
func TestCommand_RollbackEndsBattle(t *testing.T) {
	f := newFixture(t)
	f.start()
	got := f.turn(f.cmd("rollback"))
	if got.Battle != nil || !reflect.DeepEqual(types(got.Events), []string{"fled"}) || got.Player.HP != 100 || got.Player.XP != 0 {
		t.Fatalf("rollback = battle %+v events %v hp %d xp %d", got.Battle, types(got.Events), got.Player.HP, got.Player.XP)
	}
	f.status(f.do(http.MethodGet, "/api/me/battle", nil), 404, "battle_not_found")
}

// C21
func TestCommand_IgnoresClientNumbers(t *testing.T) {
	f := newFixture(t)
	f.start()
	f.env.Rand.Push(0, 0)
	got := f.turn(f.do(http.MethodPost, "/api/me/battle/commands", map[string]any{"command": "fix", "damage": 999, "hp": 1}))
	if got.Events[0].Amount != 14 || got.Battle.EnemyHP != 46 || got.Player.HP != 93 {
		t.Fatalf("client numbers leaked: %+v", got)
	}
}

// C22
func TestCommand_ConcurrentTurnsSerialize(t *testing.T) {
	f := newFixture(t)
	f.start()
	var wg sync.WaitGroup
	gate := make(chan struct{})
	codes := make([]int, 3)
	for i := range codes {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-gate
			codes[i] = f.cmd("fix").Code
		}(i)
	}
	close(gate)
	wg.Wait()
	if !reflect.DeepEqual(codes, []int{200, 200, 200}) {
		t.Fatalf("codes = %v", codes)
	}
	got := apptest.Decode[turnJSON](t, f.do(http.MethodPost, "/api/me/battle", nil))
	if got.Battle.EnemyHP != 18 || got.Battle.SP != 35 || got.Player.HP != 79 {
		t.Fatalf("enemy %d sp %d hp %d, want 18 35 79", got.Battle.EnemyHP, got.Battle.SP, got.Player.HP)
	}
}

// C23
func TestCommand_EverySkillCommand(t *testing.T) {
	cases := []struct {
		id       string
		cost     int
		min, max int
		heal     int
		weak     bool
		shield   bool
	}{
		{"f1", 12, 12, 14, 0, false, false}, {"f2", 16, 16, 20, 0, false, false}, {"f3", 20, 20, 25, 0, false, false},
		{"b1", 12, 13, 17, 0, false, false}, {"b2", 16, 0, 0, 24, false, false}, {"b3", 20, 22, 28, 0, false, false},
		{"i1", 10, 8, 10, 0, true, false}, {"i2", 14, 0, 0, 0, false, true}, {"i3", 24, 28, 34, 0, false, false},
	}
	for _, tc := range cases {
		f := newFixture(t)
		f.unlock("f1", "f2", "f3", "b1", "b2", "b3", "i1", "i2", "i3")
		f.start()
		for _, draw := range []int{0, tc.max - tc.min} {
			f.sql(`UPDATE battles SET sp = 200, sp_max = 200, enemy_hp = 500, enemy_hp_max = 500, weak = false`)
			f.sql(`UPDATE players SET hp = 10, hp_max = 1000`)
			if tc.min > 0 {
				f.env.Rand.Push(draw)
			}
			f.env.Rand.Push(0)
			got := f.turn(f.cmd(tc.id))
			if got.Battle.SP != 200-tc.cost+5 {
				t.Errorf("%s: sp %d, want %d", tc.id, got.Battle.SP, 200-tc.cost+5)
			}
			if tc.min > 0 {
				// f3 (10%) + b3 (12%) + i3 (15%) = 37% damage bonus with every skill unlocked.
				want := int(float64(tc.min+draw)*1.37 + 0.5)
				if got.Events[0].Type != "damage" || got.Events[0].Amount != want {
					t.Errorf("%s draw %d: %+v, want damage %d", tc.id, draw, got.Events[0], want)
				}
			}
			if tc.heal > 0 && got.Player.HP != 10+tc.heal-7 {
				t.Errorf("%s: hp %d, want %d", tc.id, got.Player.HP, 10+tc.heal-7)
			}
			if got.Battle.Weakness != tc.weak {
				t.Errorf("%s: weakness %v, want %v", tc.id, got.Battle.Weakness, tc.weak)
			}
			if c := got.Events[len(got.Events)-1]; c.Blocked != tc.shield {
				t.Errorf("%s: counter blocked %v, want %v", tc.id, c.Blocked, tc.shield)
			}
			if tc.min == 0 {
				break
			}
		}
	}
}

// C24
func TestCommand_BaseCosts(t *testing.T) {
	f := newFixture(t)
	f.start()
	for id, cost := range map[string]int{"fix": 10, "test": 8, "refactor": 14, "plain": 0} {
		f.sql(`UPDATE battles SET sp = 30, sp_max = 100, enemy_hp = 60, weak = false`)
		f.sql(`UPDATE players SET hp = 100`)
		got := f.turn(f.cmd(id))
		gain := map[string]int{"plain": 3}[id]
		if got.Battle.SP != 30-cost+gain+5 {
			t.Errorf("%s: sp %d, want %d", id, got.Battle.SP, 30-cost+gain+5)
		}
	}
	f.sql(`UPDATE battles SET sp = 0`)
	f.turn(f.cmd("rollback"))
}

// C26
func TestVictory_CreditsReward(t *testing.T) {
	f := newFixture(t)
	f.start()
	f.sql(`UPDATE battles SET enemy_hp = 10`)
	f.env.Rand.Push(0, 99, 99)
	got := f.turn(f.cmd("fix"))
	if got.Battle.Status != "won" || got.Battle.EnemyHP != 0 {
		t.Fatalf("battle = %+v, want won with 0", got.Battle)
	}
	if !reflect.DeepEqual(types(got.Events), []string{"damage", "victory", "reward"}) {
		t.Fatalf("events = %v", types(got.Events))
	}
	if r := got.Events[2]; r.XP != 90 || r.Coins != 40 || r.Gems != 1 {
		t.Fatalf("reward = %+v", r)
	}
	if got.Player.XP != 90 || got.Player.Coins != 140 || got.Player.Gems != 21 || got.Player.HP != 100 {
		t.Fatalf("player = %+v, want xp 90 coins 140 gems 21 and no counter", got.Player)
	}
}

// C27
func TestVictory_LevelsUpThroughGainXP(t *testing.T) {
	f := newFixture(t)
	f.start()
	f.sql(`UPDATE players SET xp = 450`)
	f.sql(`UPDATE battles SET enemy_hp = 1`)
	f.env.Rand.Push(0, 99, 99)
	got := f.turn(f.cmd("fix"))
	if got.Player.Level != 2 || got.Player.XP != 40 || got.Player.XPMax != 750 || got.Events[2].LevelsGained != 1 {
		t.Fatalf("player %+v reward %+v", got.Player, got.Events[2])
	}
}

func quantity(got turnJSON, item string) int {
	for _, it := range got.Player.Inventory {
		if it.Item == item {
			return it.Quantity
		}
	}
	return 0
}

// C28
func TestVictory_DropChanceBoundary(t *testing.T) {
	for draw, want := range map[int]int{64: 1, 65: 0} {
		f := newFixture(t)
		f.start()
		f.sql(`UPDATE battles SET enemy_hp = 1`)
		f.env.Rand.Push(0, draw, 99)
		got := f.turn(f.cmd("fix"))
		if q := quantity(got, "null_shard"); q != want {
			t.Errorf("drop draw %d: null_shard %d, want %d", draw, q, want)
		}
		if want == 1 && (got.Events[3].Type != "drop" || got.Events[3].Item != "null_shard") {
			t.Errorf("drop event = %+v", got.Events[3])
		}
	}
}

// C29
func TestVictory_PotionChanceBoundary(t *testing.T) {
	for draw, want := range map[int]int{29: 3, 30: 2} {
		f := newFixture(t)
		f.start()
		f.sql(`UPDATE battles SET enemy_hp = 1`)
		f.env.Rand.Push(0, 99, draw)
		if q := quantity(f.turn(f.cmd("fix")), "sp_potion"); q != want {
			t.Errorf("potion draw %d: sp_potion %d, want %d", draw, q, want)
		}
	}
}

// C30
func TestDefeat_RespawnAtVila(t *testing.T) {
	f := newFixture(t)
	f.sql(`UPDATE players SET region = 'floresta', hp = 7`)
	f.start()
	f.env.Rand.Push(0, 0)
	got := f.turn(f.cmd("fix"))
	if got.Battle != nil || got.Player.HP != 100 || got.Player.Region != "vila" || got.Player.XP != 0 {
		t.Fatalf("defeat = battle %+v player %+v", got.Battle, got.Player)
	}
	if !reflect.DeepEqual(types(got.Events), []string{"damage", "counter", "defeat"}) {
		t.Fatalf("events = %v", types(got.Events))
	}
	f.status(f.do(http.MethodGet, "/api/me/battle", nil), 404, "battle_not_found")

	f.sql(`UPDATE players SET hp = 8`)
	f.start()
	f.env.Rand.Push(0, 0)
	got = f.turn(f.cmd("fix"))
	if got.Battle == nil || got.Player.HP != 1 {
		t.Fatalf("hp 8 - 7: battle %+v hp %d, want alive with 1", got.Battle, got.Player.HP)
	}
}

// C31
func TestItem_PotionsRestoreAndCostTurn(t *testing.T) {
	f := newFixture(t)
	f.start()
	f.sql(`UPDATE battles SET sp = 10`)
	got := f.turn(f.item("sp_potion"))
	if quantity(got, "sp_potion") != 1 || got.Battle.SP != 45 || got.Player.HP != 93 {
		t.Fatalf("sp potion: qty %d sp %d hp %d, want 1 45 93", quantity(got, "sp_potion"), got.Battle.SP, got.Player.HP)
	}
	if !reflect.DeepEqual(types(got.Events), []string{"item", "counter"}) || got.Events[0].Item != "sp_potion" || got.Events[0].Stat != "sp" || got.Events[0].Amount != 30 {
		t.Fatalf("events = %+v", got.Events)
	}
	f.sql(`UPDATE battles SET sp = 40`)
	if got := f.turn(f.item("sp_potion")); got.Battle.SP != 50 {
		t.Fatalf("sp = %d, want 50 (capped)", got.Battle.SP)
	}
	f.sql(`INSERT INTO player_items (player_id, item_id, quantity) SELECT id, 'hp_potion', 2 FROM players`)
	f.sql(`UPDATE players SET hp = 30`)
	if got := f.turn(f.item("hp_potion")); got.Player.HP != 30+40-7 || quantity(got, "hp_potion") != 1 {
		t.Fatalf("hp potion: hp %d qty %d, want 63 1", got.Player.HP, quantity(got, "hp_potion"))
	}
	f.sql(`UPDATE players SET hp = 90`)
	if got := f.turn(f.item("hp_potion")); got.Player.HP != 100-7 {
		t.Fatalf("hp = %d, want 93 (capped at 100, then -7)", got.Player.HP)
	}
}

// C32
func TestItem_NoItem(t *testing.T) {
	f := newFixture(t)
	f.start()
	before := f.snapshot()
	f.status(f.item("hp_potion"), 409, "no_item")
	if after := f.snapshot(); after != before {
		t.Fatalf("state changed")
	}
}

// C33
func TestItem_UnknownOrNotUsable(t *testing.T) {
	f := newFixture(t)
	f.start()
	f.status(f.item("null_shard"), 422, "unknown_item")
	f.status(f.item("x"), 422, "unknown_item")
}

// C34
func TestInventory_InEveryPlayer(t *testing.T) {
	env := apptest.New(t)
	c := env.Session(1, "u")
	type inv struct {
		Player struct {
			Inventory *[]map[string]any `json:"inventory"`
		} `json:"player"`
	}
	want := []map[string]any{{"item": "sp_potion", "quantity": float64(2)}}
	rec := env.Do(http.MethodPost, "/api/players", map[string]string{"devName": "DEV_01", "class": "BACKEND"}, c)
	if got := apptest.Decode[inv](t, rec).Player.Inventory; got == nil || !reflect.DeepEqual(*got, want) {
		t.Fatalf("POST /api/players inventory = %v", got)
	}
	if got := apptest.Decode[inv](t, env.Do(http.MethodGet, "/api/me", nil, c)).Player.Inventory; !reflect.DeepEqual(*got, want) {
		t.Fatalf("GET /api/me inventory = %v", *got)
	}
	f := &fixture{t, env, c}
	f.sql(`INSERT INTO player_items (player_id, item_id, quantity) SELECT id, 'hp_potion', 1 FROM players`)
	f.sql(`INSERT INTO player_items (player_id, item_id, quantity) SELECT id, 'null_shard', 3 FROM players`)
	got := apptest.Decode[inv](t, env.Do(http.MethodGet, "/api/me", nil, c)).Player.Inventory
	var order []string
	for _, it := range *got {
		order = append(order, it["item"].(string))
	}
	if !reflect.DeepEqual(order, []string{"null_shard", "sp_potion", "hp_potion"}) {
		t.Fatalf("inventory order = %v, want catalog order", order)
	}
	f.start()
	f.turn(f.item("sp_potion"))
	f.turn(f.item("sp_potion"))
	got = apptest.Decode[inv](t, env.Do(http.MethodGet, "/api/me", nil, c)).Player.Inventory
	for _, it := range *got {
		if it["item"] == "sp_potion" {
			t.Fatalf("sp_potion with quantity 0 still listed: %v", *got)
		}
	}
}

// C35
func TestMigration_GivesExistingPlayersPotions(t *testing.T) {
	ctx := context.Background()
	base := os.Getenv("TEST_DATABASE_URL")
	if base == "" {
		base = "postgres://devserver:devserver@localhost:5433/devserver_test?sslmode=disable"
	}
	admin, err := db.Open(ctx, base)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	schema := fmt.Sprintf("m_%d", time.Now().UnixNano())
	if _, err := admin.Exec(ctx, "CREATE SCHEMA "+schema); err != nil {
		t.Fatal(err)
	}
	defer admin.Exec(ctx, "DROP SCHEMA "+schema+" CASCADE")
	u, _ := url.Parse(base)
	q := u.Query()
	q.Set("search_path", schema)
	u.RawQuery = q.Encode()

	if err := db.MigrateTo(ctx, u.String(), 3); err != nil {
		t.Fatal(err)
	}
	pool, err := db.Open(ctx, u.String())
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	if _, err := pool.Exec(ctx, `INSERT INTO players (github_user_id, dev_name, class, level, xp, xp_max, hp, hp_max,
		coins, gems, skill_points, region, skin) VALUES (1, 'OLD_DEV', 'BACKEND', 4, 0, 500, 100, 100, 0, 0, 0, 'vila', 'default')`); err != nil {
		t.Fatal(err)
	}
	if err := db.MigrateTo(ctx, u.String(), 4); err != nil {
		t.Fatal(err)
	}
	var qty int
	if err := pool.QueryRow(ctx, `SELECT quantity FROM player_items WHERE item_id = 'sp_potion'`).Scan(&qty); err != nil || qty != 2 {
		t.Fatalf("existing player sp_potion = %d (%v), want 2", qty, err)
	}
}

// C36
func TestTables_Constraints(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	code := func(q string) string {
		_, err := f.env.Pool.Exec(ctx, q)
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			return pgErr.Code
		}
		return fmt.Sprint(err)
	}
	if c := code(`UPDATE player_items SET quantity = -1`); c != "23514" {
		t.Errorf("negative quantity: %s, want 23514", c)
	}
	f.start()
	if c := code(`INSERT INTO battles (player_id, region, enemy_hp, enemy_hp_max, sp, sp_max, weak, status)
		SELECT id, 'vila', 1, 1, 1, 1, false, 'active' FROM players`); c != "23505" {
		t.Errorf("second battle: %s, want 23505", c)
	}
	if c := code(`INSERT INTO player_items (player_id, item_id, quantity) SELECT id, 'sp_potion', 1 FROM players`); c != "23505" {
		t.Errorf("second (player, item): %s, want 23505", c)
	}
}

// C38
func TestRoutes_SessionPlayerAndUnexpected(t *testing.T) {
	env := apptest.New(t)
	routes := []struct {
		method, path string
		body         any
	}{
		{http.MethodGet, "/api/me/battle", nil},
		{http.MethodPost, "/api/me/battle", nil},
		{http.MethodPost, "/api/me/battle/commands", map[string]string{"command": "fix"}},
		{http.MethodPost, "/api/me/battle/items", map[string]string{"item": "sp_potion"}},
	}
	ghost := env.Session(9, "ghost")
	for _, rt := range routes {
		if rec := env.Do(rt.method, rt.path, rt.body); rec.Code != 401 || apptest.ErrorCode(t, rec) != "unauthenticated" {
			t.Errorf("%s %s no session: %d", rt.method, rt.path, rec.Code)
		}
		if rec := env.Do(rt.method, rt.path, rt.body, ghost); rec.Code != 404 || apptest.ErrorCode(t, rec) != "player_not_found" {
			t.Errorf("%s %s no player: %d %s", rt.method, rt.path, rec.Code, rec.Body.String())
		}
	}
	f := &fixture{t, env, env.NewPlayer(1, "DEV_01", "BACKEND")}
	f.start()
	f.sql(`ALTER TABLE battles RENAME TO battles_gone`)
	for _, rt := range routes {
		rec := f.do(rt.method, rt.path, rt.body)
		if rec.Code != 500 || apptest.ErrorCode(t, rec) != "internal" {
			t.Errorf("%s %s db error: %d %s", rt.method, rt.path, rec.Code, rec.Body.String())
			continue
		}
		if id := rec.Header().Get(httpx.RequestIDHeader); !strings.Contains(env.Logs.String(), `"request_id":"`+id+`"`) {
			t.Errorf("%s %s: log lacks request id", rt.method, rt.path)
		}
	}
	f.sql(`ALTER TABLE player_items RENAME TO player_items_gone`)
	if rec := f.do(http.MethodGet, "/api/me", nil); rec.Code != 500 || apptest.ErrorCode(t, rec) != "internal" {
		t.Errorf("GET /api/me with inventory unavailable: %d %s", rec.Code, rec.Body.String())
	}
}

// C39
func TestTurn_InvalidBody(t *testing.T) {
	f := newFixture(t)
	f.start()
	for _, path := range []string{"/api/me/battle/commands", "/api/me/battle/items"} {
		for _, body := range []string{"{nope", `{"command":7,"item":7}`} {
			if rec := f.do(http.MethodPost, path, body); rec.Code != 422 || apptest.ErrorCode(t, rec) != "invalid_body" {
				t.Errorf("%s %s: %d %s", path, body, rec.Code, rec.Body.String())
			}
		}
	}
}

// C40
func TestCommand_SerializesOnPlayerRowLock(t *testing.T) {
	f := newFixture(t)
	f.start()
	f.sql(`UPDATE battles SET sp = 0`)
	ctx := context.Background()
	tx, err := f.env.Pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `SELECT 1 FROM players WHERE github_user_id = 1 FOR UPDATE`); err != nil {
		t.Fatal(err)
	}
	done := make(chan int, 1)
	go func() { done <- f.cmd("fix").Code }()
	select {
	case code := <-done:
		t.Fatalf("turn answered %d while the row was locked", code)
	case <-time.After(500 * time.Millisecond):
	}
	if _, err := tx.Exec(ctx, `UPDATE battles SET sp = 50`); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	select {
	case code := <-done:
		if code != 200 {
			t.Fatalf("turn after commit = %d, want 200 (it must read the SP written under the lock)", code)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("turn did not finish")
	}
}

// C54
func TestCreatePlayer_StartingItemsFailureRollsBack(t *testing.T) {
	env := apptest.New(t)
	f := &fixture{t, env, env.Session(1, "u")}
	f.sql(`CREATE FUNCTION reject_item() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'nope'; END $$`)
	f.sql(`CREATE TRIGGER reject_item BEFORE INSERT ON player_items FOR EACH ROW EXECUTE FUNCTION reject_item()`)
	rec := f.do(http.MethodPost, "/api/players", map[string]string{"devName": "DEV_01", "class": "BACKEND"})
	f.status(rec, 500, "internal")
	if n := env.Count("players"); n != 0 {
		t.Fatalf("players = %d, want 0 (player insert must roll back with its items)", n)
	}
}

// C55
func TestLockedMutation_InventoryLoadError(t *testing.T) {
	f := newFixture(t)
	f.sql(`ALTER TABLE player_items RENAME TO player_items_gone`)
	rec := f.do(http.MethodPost, "/api/me/travel", map[string]string{"region": "floresta"})
	f.status(rec, 500, "internal")
	if id := rec.Header().Get(httpx.RequestIDHeader); !strings.Contains(f.env.Logs.String(), `"request_id":"`+id+`"`) {
		t.Fatalf("log lacks request id %s", id)
	}
	var region string
	if err := f.env.Pool.QueryRow(context.Background(), `SELECT region FROM players`).Scan(&region); err != nil || region != "vila" {
		t.Fatalf("region = %q (%v), want vila unchanged", region, err)
	}
	if !strings.Contains(f.env.Logs.String(), "player_items") {
		t.Fatalf("logged cause is not the inventory load: %s", f.env.Logs.String())
	}
	// A guard-first mutation (no points, so the guard would answer 409) must still fail on the load.
	f.sql(`UPDATE players SET skill_points = 0`)
	f.status(f.do(http.MethodPost, "/api/me/skills/f1/unlock", nil), 500, "internal")
}

// C56
func TestCreatePlayer_StartingItemsFromCatalog(t *testing.T) {
	env := apptest.NewWithCatalog(t, func(c *catalog.Catalog) {
		c.Combat.StartingItems = []catalog.ItemQuantity{{Item: "hp_potion", Quantity: 3}, {Item: "sp_potion", Quantity: 1}}
	})
	rec := env.Do(http.MethodPost, "/api/players", map[string]string{"devName": "DEV_01", "class": "BACKEND"}, env.Session(1, "u"))
	got := apptest.Decode[turnJSON](t, rec).Player.Inventory
	want := []struct {
		Item     string `json:"item"`
		Quantity int    `json:"quantity"`
	}{{"sp_potion", 1}, {"hp_potion", 3}}
	if len(got) != 2 || got[0] != want[0] || got[1] != want[1] {
		t.Fatalf("inventory = %+v, want %+v (read from the catalog)", got, want)
	}
}
