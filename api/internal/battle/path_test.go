package battle_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"devserver/api/internal/apptest"
	"devserver/api/internal/httpx"
)

func progressOf(t *testing.T, raw []byte) map[string]int {
	t.Helper()
	var wrap struct {
		Player struct {
			Progress map[string]int `json:"progress"`
			Region   string         `json:"region"`
			HP       int            `json:"hp"`
			HPMax    int            `json:"hpMax"`
		} `json:"player"`
	}
	if err := json.Unmarshal(raw, &wrap); err != nil {
		t.Fatal(err)
	}
	return wrap.Player.Progress
}

func TestStart_NoBodyOmitsNode(t *testing.T) {
	for _, body := range []any{nil, "   ", "{}"} {
		f := newFixture(t)
		rec := f.do(http.MethodPost, "/api/me/battle", body)
		if rec.Code != 200 {
			t.Fatalf("body %v: %d %s", body, rec.Code, rec.Body.String())
		}
		var raw map[string]json.RawMessage
		if err := json.Unmarshal(rec.Body.Bytes(), &raw); err != nil {
			t.Fatal(err)
		}
		var battle map[string]json.RawMessage
		if err := json.Unmarshal(raw["battle"], &battle); err != nil {
			t.Fatal(err)
		}
		if _, ok := battle["node"]; ok {
			t.Fatalf("body %v: battle has node %s", body, battle["node"])
		}
		if got := string(mustPlayer(t, raw)["progress"]); got != "{}" {
			t.Fatalf("body %v: progress = %s, want {}", body, got)
		}
	}
}

func mustPlayer(t *testing.T, raw map[string]json.RawMessage) map[string]json.RawMessage {
	t.Helper()
	var player map[string]json.RawMessage
	if err := json.Unmarshal(raw["player"], &player); err != nil {
		t.Fatal(err)
	}
	return player
}

func TestStart_NodeFrontier(t *testing.T) {
	f := newFixture(t)
	rec := f.do(http.MethodPost, "/api/me/battle", map[string]string{"node": "vila-1"})
	if rec.Code != 200 {
		t.Fatalf("start: %d %s", rec.Code, rec.Body.String())
	}
	b := apptest.Decode[turnJSON](t, rec).Battle
	if b.Enemy != "slime" || b.EnemyHP != 45 || b.EnemyHPMax != 45 || b.Node != "vila-1" || b.Status != "active" {
		t.Fatalf("battle = %+v", b)
	}
}

func TestStart_NodeInvalidBody(t *testing.T) {
	f := newFixture(t)
	f.status(f.do(http.MethodPost, "/api/me/battle", "{"), 422, "invalid_body")
}

func TestStart_NodeUnknown(t *testing.T) {
	f := newFixture(t)
	f.status(f.do(http.MethodPost, "/api/me/battle", map[string]string{"node": "nao-existe"}), 422, "unknown_node")
}

func TestStart_NodeWrongRegion(t *testing.T) {
	f := newFixture(t)
	first := f.start().Battle
	f.status(f.do(http.MethodPost, "/api/me/battle", map[string]string{"node": "floresta-1"}), 409, "wrong_region")
	rec := f.do(http.MethodGet, "/api/me/battle", nil)
	if rec.Code != 200 {
		t.Fatalf("GET: %d %s", rec.Code, rec.Body.String())
	}
	b := apptest.Decode[turnJSON](t, rec).Battle
	if b.Enemy != first.Enemy || b.EnemyHP != first.EnemyHP {
		t.Fatalf("battle changed to %+v, was %+v", b, first)
	}
}

func TestStart_NodeLocked(t *testing.T) {
	f := newFixture(t)
	f.status(f.do(http.MethodPost, "/api/me/battle", map[string]string{"node": "vila-2"}), 409, "node_locked")
	f.status(f.do(http.MethodGet, "/api/me/battle", nil), 404, "battle_not_found")
}

func TestStart_NodeReplay(t *testing.T) {
	f := newFixture(t)
	f.sql(`INSERT INTO region_progress (player_id, region, cleared) SELECT id, 'vila', 2 FROM players`)
	rec := f.do(http.MethodPost, "/api/me/battle", map[string]string{"node": "vila-1"})
	if rec.Code != 200 {
		t.Fatalf("replay: %d %s", rec.Code, rec.Body.String())
	}
	if b := apptest.Decode[turnJSON](t, rec).Battle; b.Enemy != "slime" || b.Node != "vila-1" {
		t.Fatalf("battle = %+v", b)
	}
}

func TestStart_ActiveBattleKeepsNode(t *testing.T) {
	f := newFixture(t)
	f.sql(`INSERT INTO region_progress (player_id, region, cleared) SELECT id, 'vila', 1 FROM players`)
	rec := f.do(http.MethodPost, "/api/me/battle", map[string]string{"node": "vila-2"})
	if rec.Code != 200 {
		t.Fatalf("start vila-2: %d %s", rec.Code, rec.Body.String())
	}
	f.sql(`UPDATE battles SET enemy_hp = 10`)
	rec = f.do(http.MethodPost, "/api/me/battle", map[string]string{"node": "vila-1"})
	if rec.Code != 200 {
		t.Fatalf("resume: %d %s", rec.Code, rec.Body.String())
	}
	b := apptest.Decode[turnJSON](t, rec).Battle
	if b.Node != "vila-2" || b.EnemyHP != 10 {
		t.Fatalf("battle = %+v, want node vila-2 hp 10", b)
	}
}

func TestStart_NodePlayerNotFound(t *testing.T) {
	env := apptest.New(t)
	ghost := env.Session(9, "ghost")
	rec := env.Do(http.MethodPost, "/api/me/battle", map[string]string{"node": "vila-1"}, ghost)
	if rec.Code != 404 || apptest.ErrorCode(t, rec) != "player_not_found" {
		t.Fatalf("got %d %s", rec.Code, rec.Body.String())
	}
}

func TestStart_NodeProgressTableMissing(t *testing.T) {
	f := newFixture(t)
	f.sql(`DROP TABLE region_progress`)
	rec := f.do(http.MethodPost, "/api/me/battle", map[string]string{"node": "vila-1"})
	if rec.Code != 500 || apptest.ErrorCode(t, rec) != "internal" {
		t.Fatalf("got %d %s", rec.Code, rec.Body.String())
	}
	if id := rec.Header().Get(httpx.RequestIDHeader); id == "" {
		t.Fatal("500 without a request id")
	}
}

func TestStart_NodeWrongRegionBeforeLocked(t *testing.T) {
	f := newFixture(t)
	f.status(f.do(http.MethodPost, "/api/me/battle", map[string]string{"node": "floresta-5"}), 409, "wrong_region")
}

func TestTurn_NodeVictoryAdvances(t *testing.T) {
	f := newFixture(t)
	f.do(http.MethodPost, "/api/me/battle", map[string]string{"node": "vila-1"})
	f.sql(`UPDATE battles SET enemy_hp = 1`)
	rec := f.cmd("fix")
	got := f.turn(rec)
	if got.Player.Region != "" && progressOf(t, rec.Body.Bytes())["vila"] != 1 {
		t.Fatalf("progress after win = %v", progressOf(t, rec.Body.Bytes()))
	}
	if progressOf(t, rec.Body.Bytes())["vila"] != 1 {
		t.Fatalf("turn progress = %v", progressOf(t, rec.Body.Bytes()))
	}
	me := f.do(http.MethodGet, "/api/me", nil)
	if me.Code != 200 {
		t.Fatalf("GET /api/me: %d %s", me.Code, me.Body.String())
	}
	var body struct {
		Player struct {
			Progress map[string]int `json:"progress"`
		} `json:"player"`
	}
	if err := json.Unmarshal(me.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Player.Progress["vila"] != 1 {
		t.Fatalf("GET progress = %v, want vila 1", body.Player.Progress)
	}
}

func TestTurn_NodeReplayDoesNotAdvance(t *testing.T) {
	f := newFixture(t)
	f.sql(`INSERT INTO region_progress (player_id, region, cleared) SELECT id, 'vila', 2 FROM players`)
	f.do(http.MethodPost, "/api/me/battle", map[string]string{"node": "vila-1"})
	f.sql(`UPDATE battles SET enemy_hp = 1`)
	rec := f.cmd("fix")
	f.turn(rec)
	if got := progressOf(t, rec.Body.Bytes())["vila"]; got != 2 {
		t.Fatalf("progress = %d, want 2", got)
	}
}

func TestTurn_DefeatKeepsProgress(t *testing.T) {
	f := newFixture(t)
	f.do(http.MethodPost, "/api/me/battle", map[string]string{"node": "vila-1"})
	f.sql(`UPDATE battles SET enemy_hp = 1`)
	f.turn(f.cmd("fix"))
	if rec := f.do(http.MethodPost, "/api/me/battle", map[string]string{"node": "vila-2"}); rec.Code != 200 {
		t.Fatalf("vila-2: %d %s", rec.Code, rec.Body.String())
	}
	f.sql(`UPDATE players SET hp = 1`)
	f.sql(`UPDATE battles SET enemy_hp = 500`)
	rec := f.cmd("fix")
	got := f.turn(rec)
	if got.Player.Region != "vila" || got.Player.HP != got.Player.HPMax {
		t.Fatalf("after defeat region %s hp %d/%d", got.Player.Region, got.Player.HP, got.Player.HPMax)
	}
	if progressOf(t, rec.Body.Bytes())["vila"] != 1 {
		t.Fatalf("progress = %v, want vila 1", progressOf(t, rec.Body.Bytes()))
	}
}
