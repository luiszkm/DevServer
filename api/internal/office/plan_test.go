package office

import (
	"errors"
	"fmt"
	"testing"

	"devserver/api/internal/catalog"
	"devserver/api/internal/httpx"
)

func officeWith(cells map[string]string) map[string][]*string {
	o := map[string][]*string{"parede": make([]*string, 8), "piso": make([]*string, 24)}
	for key, id := range cells {
		var zone string
		var pos int
		fmt.Sscanf(key, "%s %d", &zone, &pos)
		v := id
		o[zone][pos] = &v
	}
	return o
}

// C15
func TestOfficeComfort(t *testing.T) {
	cat := catalog.Default()
	for _, tc := range []struct {
		name  string
		cells map[string]string
		want  int
	}{
		{"empty room", nil, 0},
		{"one mesa", map[string]string{"piso 0": "mesa"}, 8},
		{"mesa twice", map[string]string{"piso 0": "mesa", "piso 5": "mesa"}, 16},
		{"id outside the catalog", map[string]string{"piso 0": "sofa_velho"}, 0},
	} {
		if got := officeComfort(cat, officeWith(tc.cells)); got != tc.want {
			t.Errorf("%s: comfort %d, want %d", tc.name, got, tc.want)
		}
	}
}

// C25
func TestPlanTemplate(t *testing.T) {
	cat := catalog.Default()
	tpl := catalog.OfficeTemplate{ID: "t", Pieces: []catalog.TemplatePiece{
		{Zone: "piso", Position: 0, Furniture: "mesa"},
		{Zone: "parede", Position: 1, Furniture: "neon"},
	}}

	installs, cost, err := planTemplate(cat, tpl, officeWith(nil))
	if err != nil || len(installs) != 2 || cost["coins"] != 60 || cost["gems"] != 35 {
		t.Errorf("empty cells: %v %v %v, want both installed, 60 coins and 35 gems", installs, cost, err)
	}

	installs, cost, err = planTemplate(cat, tpl, officeWith(map[string]string{"piso 0": "mesa"}))
	if err != nil || len(installs) != 1 || installs[0].Furniture != "neon" || cost["coins"] != 0 || cost["gems"] != 35 {
		t.Errorf("same piece: %v %v %v, want only neon and 35 gems", installs, cost, err)
	}

	for _, occupant := range []string{"planta", "sofa_velho"} {
		if _, _, err := planTemplate(cat, tpl, officeWith(map[string]string{"piso 0": occupant})); !errors.Is(err, httpx.ErrCellOccupied) {
			t.Errorf("%s in the cell: %v, want cell_occupied", occupant, err)
		}
	}

	gone := catalog.OfficeTemplate{ID: "g", Pieces: []catalog.TemplatePiece{{Zone: "piso", Position: 0, Furniture: "sofa_velho"}}}
	if _, _, err := planTemplate(cat, gone, officeWith(nil)); !errors.Is(err, httpx.ErrUnknownFurniture) {
		t.Errorf("piece outside the catalog: %v, want unknown_furniture", err)
	}
}
