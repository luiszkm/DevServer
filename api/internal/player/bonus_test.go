package player_test

import (
	"testing"

	"devserver/api/internal/catalog"
	"devserver/api/internal/player"
)

// C18 (shop-inventory-avatar, own layer)
func TestBonus_SumsSources(t *testing.T) {
	cat := catalog.Default()
	equip := func(pairs ...string) map[string]*string {
		m := map[string]*string{"setup": nil, "bebida": nil, "vestuario": nil, "acessorio": nil}
		for i := 0; i < len(pairs); i += 2 {
			id := pairs[i+1]
			m[pairs[i]] = &id
		}
		return m
	}
	for _, tc := range []struct {
		name   string
		p      player.Player
		typ    string
		amount int
	}{
		{"only skill f3", player.Player{Skills: []string{"f3"}, Equipment: equip(), Skin: "default"}, "dmg", 10},
		{"only macbook equipped", player.Player{Gear: []string{"macbook"}, Equipment: equip("setup", "macbook"), Skin: "default"}, "dmg", 8},
		{"only skin neon", player.Player{Equipment: equip(), Skin: "neon"}, "dmg", 5},
		{"f2 + cafe + shadow", player.Player{Skills: []string{"f1", "f2"}, Gear: []string{"cafe"}, Equipment: equip("bebida", "cafe"), Skin: "shadow"}, "sp", 30},
		{"moletom + golden + f1", player.Player{Skills: []string{"f1"}, Gear: []string{"moletom"}, Equipment: equip("vestuario", "moletom"), Skin: "golden"}, "hp", 45},
		{"owned, not equipped", player.Player{Gear: []string{"macbook", "monitor", "cafe"}, Equipment: equip(), Skin: "default"}, "dmg", 0},
		{"owned, not equipped (sp)", player.Player{Gear: []string{"monitor", "cafe"}, Equipment: equip(), Skin: "default"}, "sp", 0},
		{"skin default", player.Player{Equipment: equip(), Skin: "default"}, "hp", 0},
		{"other type ignored", player.Player{Skills: []string{"f3"}, Gear: []string{"macbook"}, Equipment: equip("setup", "macbook"), Skin: "neon"}, "sp", 0},
	} {
		if got := player.Bonus(cat, &tc.p, tc.typ); got != tc.amount {
			t.Errorf("%s: Bonus(%s) = %d, want %d", tc.name, tc.typ, got, tc.amount)
		}
	}
}

// C21, C43 (office, own layer)
func TestBonus_Office(t *testing.T) {
	cat := catalog.Default()
	room := func(floor []string, wall ...string) map[string][]*string {
		o := map[string][]*string{"parede": make([]*string, 8), "piso": make([]*string, 24)}
		for i, id := range floor {
			o["piso"][i] = &id
		}
		for i, id := range wall {
			o["parede"][i] = &id
		}
		return o
	}
	n := func(id string, k int) []string {
		s := make([]string, k)
		for i := range s {
			s[i] = id
		}
		return s
	}
	none := map[string]*string{"setup": nil, "bebida": nil, "vestuario": nil, "acessorio": nil}
	allBonus := room([]string{"mesa", "cadeira_gamer", "setup2", "rack", "cafeteira", "estante", "planta", "tapete"}, "neon", "poster", "kanban", "janela")
	macbook, cafe, moletom := "macbook", "cafe", "moletom"
	otherSources := player.Player{
		Skills: []string{"f1", "f2", "f3"}, Gear: []string{"macbook", "cafe", "moletom"},
		Equipment: map[string]*string{"setup": &macbook, "bebida": &cafe, "vestuario": &moletom, "acessorio": nil},
		Skin:      "golden", Office: room(nil),
	}
	for _, tc := range []struct {
		name   string
		p      player.Player
		typ    string
		amount int
	}{
		{"mesa + estante + kanban", player.Player{Equipment: none, Skin: "default", Office: room([]string{"mesa", "estante"}, "kanban")}, "xp", 7},
		{"setup2 + rack", player.Player{Equipment: none, Skin: "default", Office: room([]string{"setup2", "rack"})}, "deploy", 11},
		{"8 setup2", player.Player{Equipment: none, Skin: "default", Office: room(n("setup2", 8))}, "deploy", 40},
		{"7 setup2 + rack = 41", player.Player{Equipment: none, Skin: "default", Office: room(append(n("setup2", 7), "rack"))}, "deploy", 40},
		{"cadeira_gamer + cafeteira", player.Player{Equipment: none, Skin: "default", Office: room([]string{"cadeira_gamer", "cafeteira"})}, "spregen", 3},
		{"planta xp", player.Player{Equipment: none, Skin: "default", Office: room([]string{"planta"})}, "xp", 0},
		{"planta deploy", player.Player{Equipment: none, Skin: "default", Office: room([]string{"planta"})}, "deploy", 0},
		{"planta spregen", player.Player{Equipment: none, Skin: "default", Office: room([]string{"planta"})}, "spregen", 0},
		{"furniture hp", player.Player{Equipment: none, Skin: "default", Office: allBonus}, "hp", 0},
		{"furniture sp", player.Player{Equipment: none, Skin: "default", Office: allBonus}, "sp", 0},
		{"furniture dmg", player.Player{Equipment: none, Skin: "default", Office: allBonus}, "dmg", 0},
		{"other sources xp", otherSources, "xp", 0},
		{"other sources deploy", otherSources, "deploy", 0},
		{"other sources spregen", otherSources, "spregen", 0},
		{"unknown furniture xp", player.Player{Equipment: none, Skin: "default", Office: room([]string{"sofa"})}, "xp", 0},
		{"unknown furniture deploy", player.Player{Equipment: none, Skin: "default", Office: room([]string{"sofa"})}, "deploy", 0},
		{"unknown furniture spregen", player.Player{Equipment: none, Skin: "default", Office: room([]string{"sofa"})}, "spregen", 0},
	} {
		if got := player.Bonus(cat, &tc.p, tc.typ); got != tc.amount {
			t.Errorf("%s: Bonus(%s) = %d, want %d", tc.name, tc.typ, got, tc.amount)
		}
	}
}

// C21, C26 (server-room, own layer)
func TestBonus_Rack(t *testing.T) {
	cat := catalog.Default()
	none := map[string]*string{"setup": nil, "bebida": nil, "vestuario": nil, "acessorio": nil}
	rack := func(ids ...string) player.Player {
		r := make([]*string, 6)
		for i, id := range ids {
			r[i] = &id
		}
		return player.Player{Equipment: none, Skin: "default", Rack: r}
	}
	six := func(id string) player.Player { return rack(id, id, id, id, id, id) }
	macbook := "macbook"
	withOthers := rack("gpu", "ram")
	withOthers.Skills = []string{"f2", "f3"}
	withOthers.Gear = []string{"macbook"}
	withOthers.Equipment = map[string]*string{"setup": &macbook, "bebida": nil, "vestuario": nil, "acessorio": nil}
	skinned := rack("gpu")
	skinned.Skin = "neon"
	for _, tc := range []struct {
		name   string
		p      player.Player
		typ    string
		amount int
	}{
		{"empty dmg", rack(), "dmg", 0},
		{"empty sp", rack(), "sp", 0},
		{"empty coins", rack(), "coins", 0},
		{"gpu: POWER 60", rack("gpu"), "dmg", 4},
		{"cpu: POWER 45", rack("cpu"), "dmg", 2},
		{"cache: POWER 38 floors to 1", rack("cache"), "dmg", 1},
		{"cpu + gpu: POWER 85 floors to 6", rack("cpu", "gpu"), "dmg", 6},
		{"6 gpu: POWER capped at 100", six("gpu"), "dmg", 8},
		{"ram: RAM 45", rack("ram"), "sp", 6},
		{"6 ram: RAM capped at 100", six("ram"), "sp", 17},
		{"lb: UPTIME 80", rack("lb"), "coins", 20},
		{"6 lb: UPTIME capped at 99", six("lb"), "coins", 39},
		{"ssd dmg", rack("ssd"), "dmg", 1},
		{"ssd coins", rack("ssd"), "coins", 8},
		{"ram gives no dmg", rack("ram"), "dmg", 0},
		{"gpu gives no coins", rack("gpu"), "coins", 0},
		{"lb gives no sp", rack("lb"), "sp", 0},
		{"rack hp", rack("gpu", "ram", "lb", "ssd", "cpu", "cache"), "hp", 0},
		{"rack xp", rack("gpu", "ram", "lb", "ssd", "cpu", "cache"), "xp", 0},
		{"rack deploy", rack("gpu", "ram", "lb", "ssd", "cpu", "cache"), "deploy", 0},
		{"rack spregen", rack("gpu", "ram", "lb", "ssd", "cpu", "cache"), "spregen", 0},
		{"summed with skills and gear dmg: 10 + 8 + 4", withOthers, "dmg", 22},
		{"summed with skills sp: 8 + 6", withOthers, "sp", 14},
		{"summed with skin neon dmg: 5 + 4", skinned, "dmg", 9},
		{"unknown component dmg", rack("quantum"), "dmg", 0},
		{"unknown component sp", rack("quantum"), "sp", 0},
		{"unknown component coins", rack("quantum"), "coins", 0},
		{"unknown component beside gpu", rack("quantum", "gpu"), "dmg", 4},
	} {
		if got := player.Bonus(cat, &tc.p, tc.typ); got != tc.amount {
			t.Errorf("%s: Bonus(%s) = %d, want %d", tc.name, tc.typ, got, tc.amount)
		}
	}
}
