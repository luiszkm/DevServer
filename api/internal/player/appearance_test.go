package player_test

import (
	"reflect"
	"testing"

	"devserver/api/internal/catalog"
	"devserver/api/internal/player"
)

// Avatar C4 and body contract (own layer): one case per row of the appearance rule.
func TestResolveAppearance_Rows(t *testing.T) {
	cat := catalog.Default()
	defaults := cat.Avatar.Defaults
	with := func(pairs ...string) map[string]string {
		m := map[string]string{}
		for k, v := range defaults {
			m[k] = v
		}
		for i := 0; i < len(pairs); i += 2 {
			m[pairs[i]] = pairs[i+1]
		}
		return m
	}
	feminino := with("hair", "hair_longo")
	for _, tc := range []struct {
		name, body string
		picks      map[string]string
		want       map[string]string
	}{
		{"no picks: every part at its default", "masculino", nil, defaults},
		{"a free pick of the part is worn", "masculino", map[string]string{"hair": "hair_curto"}, with("hair", "hair_curto")},
		{"a priced pick is worn (ownership is checked when picked)", "masculino", map[string]string{"hair": "hair_moicano"}, with("hair", "hair_moicano")},
		{"an option no longer in the catalog falls back", "masculino", map[string]string{"hair": "hair_gone"}, defaults},
		{"an option of another part falls back", "masculino", map[string]string{"hair": "hair_preto"}, defaults},
		{"a gear-only option falls back", "masculino", map[string]string{"top": "top_hoodie_trace"}, defaults},
		{"a part no longer in the catalog is dropped", "masculino", map[string]string{"hat": "hat_bone"}, defaults},
		{"feminino without picks wears the body's defaults over the shared ones", "feminino", nil, feminino},
		{"a pick available to every body is worn by feminino", "feminino", map[string]string{"hair": "hair_espetado"}, with("hair", "hair_espetado")},
		{"a pick only for the body is worn", "feminino", map[string]string{"hair": "hair_rabo"}, with("hair", "hair_rabo")},
		{"a masculino-only pick falls back to feminino's default", "feminino", map[string]string{"beard": "beard_cheia"}, feminino},
		{"a feminino-only pick falls back to masculino's default", "masculino", map[string]string{"hair": "hair_trancas"}, defaults},
		{"a masculino-only pick is worn by masculino", "masculino", map[string]string{"beard": "beard_cheia"}, with("beard", "beard_cheia")},
	} {
		if got := player.ResolveAppearance(cat, tc.body, tc.picks); !reflect.DeepEqual(got, tc.want) {
			t.Errorf("%s: appearance = %v, want %v", tc.name, got, tc.want)
		}
	}
}
