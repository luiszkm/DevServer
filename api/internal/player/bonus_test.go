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

// C21 (office, own layer)
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
	} {
		if got := player.Bonus(cat, &tc.p, tc.typ); got != tc.amount {
			t.Errorf("%s: Bonus(%s) = %d, want %d", tc.name, tc.typ, got, tc.amount)
		}
	}
}
