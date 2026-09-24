package battle_test

import "testing"

// rack writes components into slots 0, 1, ...
func (f *fixture) rack(ids ...string) {
	f.t.Helper()
	for i, id := range ids {
		f.sql(`INSERT INTO player_rack (player_id, slot, component_id) SELECT id, $1, $2 FROM players`, i, id)
	}
}

// C22 (server-room)
func TestBattle_RackSPMax(t *testing.T) {
	for _, tc := range []struct {
		name string
		rack []string
		sp   int
	}{
		{"no rack", nil, 50},
		{"one ram: RAM 45", []string{"ram"}, 56},
		{"six ram: RAM capped at 100", []string{"ram", "ram", "ram", "ram", "ram", "ram"}, 67},
	} {
		f := newFixture(t)
		f.rack(tc.rack...)
		if st := f.start(); st.Battle.SP != tc.sp || st.Battle.SPMax != tc.sp {
			t.Errorf("%s: sp %d/%d, want %d/%d", tc.name, st.Battle.SP, st.Battle.SPMax, tc.sp, tc.sp)
		}
	}
}

// C23 (server-room)
func TestBattle_RackDamage(t *testing.T) {
	for _, tc := range []struct {
		name   string
		rack   []string
		damage int
	}{
		{"no rack", nil, 20},
		{"one gpu: +4% (20.8)", []string{"gpu"}, 21},
		{"six gpu: +8% (21.6)", []string{"gpu", "gpu", "gpu", "gpu", "gpu", "gpu"}, 22},
	} {
		f := newFixture(t)
		f.rack(tc.rack...)
		f.start()
		f.env.Rand.Push(6, 0)
		got := f.turn(f.cmd("fix"))
		if got.Events[0].Type != "damage" || got.Events[0].Amount != tc.damage {
			t.Errorf("%s: events %+v, want damage %d", tc.name, got.Events, tc.damage)
		}
	}
}
