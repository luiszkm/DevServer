package player_test

import (
	"errors"
	"testing"

	"devserver/api/internal/catalog"
	"devserver/api/internal/httpx"
	"devserver/api/internal/player"
)

// C42 (office, own layer)
func TestPay_BalanceByCurrency(t *testing.T) {
	for _, tc := range []struct {
		name               string
		gems, coins        int
		price              catalog.Price
		err                error
		wantGems, wantCoin int
	}{
		{"gems equal", 15, 7, catalog.Price{Currency: "gems", Amount: 15}, nil, 0, 7},
		{"gems below", 14, 7, catalog.Price{Currency: "gems", Amount: 15}, httpx.ErrNotEnoughGems, 14, 7},
		{"coins equal", 7, 50, catalog.Price{Currency: "coins", Amount: 50}, nil, 7, 0},
		{"coins below", 7, 49, catalog.Price{Currency: "coins", Amount: 50}, httpx.ErrNotEnoughCoins, 7, 49},
	} {
		p := &player.Player{Gems: tc.gems, Coins: tc.coins}
		err := player.Pay(p, tc.price)
		if !errors.Is(err, tc.err) {
			t.Errorf("%s: err %v, want %v", tc.name, err, tc.err)
		}
		if p.Gems != tc.wantGems || p.Coins != tc.wantCoin {
			t.Errorf("%s: gems %d coins %d, want %d and %d", tc.name, p.Gems, p.Coins, tc.wantGems, tc.wantCoin)
		}
	}
}
