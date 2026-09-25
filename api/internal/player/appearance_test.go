package player_test

import (
	"reflect"
	"testing"

	"devserver/api/internal/catalog"
	"devserver/api/internal/player"
)

// Avatar C4 (own layer): one case per row of the appearance rule.
func TestResolveAppearance_Rows(t *testing.T) {
	cat := catalog.Default()
	defaults := cat.Avatar.Defaults
	with := func(part, option string) map[string]string {
		m := map[string]string{}
		for k, v := range defaults {
			m[k] = v
		}
		m[part] = option
		return m
	}
	for _, tc := range []struct {
		name  string
		picks map[string]string
		want  map[string]string
	}{
		{"no picks: every part at its default", nil, defaults},
		{"a free pick of the part is worn", map[string]string{"hair": "hair_curto"}, with("hair", "hair_curto")},
		{"a priced pick is worn (ownership is checked when picked)", map[string]string{"hair": "hair_moicano"}, with("hair", "hair_moicano")},
		{"an option no longer in the catalog falls back", map[string]string{"hair": "hair_gone"}, defaults},
		{"an option of another part falls back", map[string]string{"hair": "hair_preto"}, defaults},
		{"a gear-only option falls back", map[string]string{"top": "top_hoodie_trace"}, defaults},
		{"a part no longer in the catalog is dropped", map[string]string{"hat": "hat_bone"}, defaults},
	} {
		if got := player.ResolveAppearance(cat, tc.picks); !reflect.DeepEqual(got, tc.want) {
			t.Errorf("%s: appearance = %v, want %v", tc.name, got, tc.want)
		}
	}
}
