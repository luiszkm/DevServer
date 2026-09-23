// Package battle runs turn-based fights against the enemy of the player's region. Every number
// is drawn on the server from the injected Rand (AD-011).
package battle

import (
	"math"

	"devserver/api/internal/catalog"
	"devserver/api/internal/player"
)

// Rand is the source of every draw; draws happen in the order damage, counter, drop, potion.
type Rand interface {
	IntN(n int) int
}

// State is the fight as stored in `battles`.
type State struct {
	Region     string `json:"region"`
	EnemyHP    int    `json:"enemyHp"`
	EnemyHPMax int    `json:"enemyHpMax"`
	SP         int    `json:"sp"`
	SPMax      int    `json:"spMax"`
	Weak       bool   `json:"weakness"`
	Status     string `json:"status"`
}

// Event is one thing that happened in a turn, rendered by the web.
type Event struct {
	Type         string `json:"type"`
	Command      string `json:"command,omitempty"`
	Item         string `json:"item,omitempty"`
	Stat         string `json:"stat,omitempty"`
	Amount       int    `json:"amount,omitempty"`
	Weakness     bool   `json:"weakness,omitempty"`
	Blocked      bool   `json:"blocked,omitempty"`
	XP           int    `json:"xp,omitempty"`
	Coins        int    `json:"coins,omitempty"`
	Gems         int    `json:"gems,omitempty"`
	LevelsGained int    `json:"levelsGained,omitempty"`
}

// Outcome is how a turn ended, beyond its events.
type Outcome struct {
	Events   []Event
	Drops    []string
	Won      bool
	Defeated bool
	Fled     bool
}

type Rules struct {
	Combat catalog.CombatRules
	Enemy  catalog.Enemy
	// DamageBonus is the percent added to every hit (skills door 2).
	DamageBonus int
}

func round(x float64) int { return int(math.Round(x)) }

func clamp(v, hi int) int { return max(0, min(hi, v)) }

// Hit turns a drawn base damage into the damage dealt, consuming the exposed weakness.
func Hit(st *State, base int, r Rules) (dmg int, usedWeakness bool) {
	dmg = base
	if st.Weak {
		dmg = round(float64(dmg) * r.Combat.WeaknessMultiplier)
		st.Weak, usedWeakness = false, true
	}
	if r.DamageBonus > 0 {
		dmg = round(float64(dmg) * (1 + float64(r.DamageBonus)/100))
	}
	return dmg, usedWeakness
}

// Shielded halves a counter, rounding half up.
func Shielded(counter int) int { return round(float64(counter) / 2) }

// ApplyCommand plays the player's side of a turn, then the rest of the turn via EndTurn.
// The caller has already checked the cost and that the command is unlocked.
func ApplyCommand(st *State, p *player.Player, cmd catalog.Command, r Rules, rnd Rand) Outcome {
	if cmd.Flee {
		return Outcome{Events: []Event{{Type: "fled"}}, Fled: true}
	}
	var events []Event
	st.SP = clamp(st.SP-cmd.Cost, st.SPMax)
	if len(cmd.Damage) == 2 {
		base := cmd.Damage[0] + rnd.IntN(cmd.Damage[1]-cmd.Damage[0]+1)
		dmg, weak := Hit(st, base, r)
		st.EnemyHP = max(0, st.EnemyHP-dmg)
		events = append(events, Event{Type: "damage", Command: cmd.ID, Amount: dmg, Weakness: weak})
	}
	if cmd.Heal > 0 {
		p.HP = min(p.HPMax, p.HP+cmd.Heal)
		events = append(events, Event{Type: "heal", Amount: cmd.Heal})
	}
	if cmd.ExposesWeakness {
		st.Weak = true
		events = append(events, Event{Type: "weakness"})
	}
	if cmd.Shield {
		events = append(events, Event{Type: "shield"})
	}
	if cmd.SPGain > 0 {
		st.SP = clamp(st.SP+cmd.SPGain, st.SPMax)
		events = append(events, Event{Type: "sp", Amount: cmd.SPGain})
	}
	out := EndTurn(st, p, cmd.Shield, r, rnd)
	out.Events = append(events, out.Events...)
	return out
}

// UseItem restores a stat from a potion, then the enemy takes its turn.
func UseItem(st *State, p *player.Player, it catalog.Item, r Rules, rnd Rand) Outcome {
	res := it.Restore
	if res.Stat == "sp" {
		st.SP = clamp(st.SP+res.Amount, st.SPMax)
	} else {
		p.HP = min(p.HPMax, p.HP+res.Amount)
	}
	out := EndTurn(st, p, false, r, rnd)
	out.Events = append([]Event{{Type: "item", Item: it.ID, Stat: res.Stat, Amount: res.Amount}}, out.Events...)
	return out
}

// EndTurn resolves victory, or the enemy's counter and the SP regeneration.
func EndTurn(st *State, p *player.Player, shield bool, r Rules, rnd Rand) Outcome {
	c := r.Combat
	if st.EnemyHP <= 0 {
		st.Status = "won"
		v := c.Victory
		levels := player.GainXP(p, v.XP)
		p.Coins += v.Coins
		p.Gems += v.Gems
		out := Outcome{Won: true, Events: []Event{
			{Type: "victory"},
			{Type: "reward", XP: v.XP, Coins: v.Coins, Gems: v.Gems, LevelsGained: levels},
		}}
		if rnd.IntN(100) < c.DropChance {
			out.Drops = append(out.Drops, r.Enemy.Drop)
		}
		if rnd.IntN(100) < c.PotionChance {
			out.Drops = append(out.Drops, c.Potion)
		}
		for _, d := range out.Drops {
			out.Events = append(out.Events, Event{Type: "drop", Item: d})
		}
		return out
	}
	counter := c.Counter[0] + rnd.IntN(c.Counter[1]-c.Counter[0]+1)
	if shield {
		counter = Shielded(counter)
	}
	p.HP -= counter
	out := Outcome{Events: []Event{{Type: "counter", Amount: counter, Blocked: shield}}}
	if p.HP <= 0 {
		p.HP = p.HPMax
		p.Region = "vila"
		out.Defeated = true
		out.Events = append(out.Events, Event{Type: "defeat"})
		return out
	}
	st.SP = clamp(st.SP+c.SPRegen, st.SPMax)
	return out
}
