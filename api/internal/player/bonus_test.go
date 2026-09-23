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
