// Package catalog loads the embedded balance data and serves it at GET /api/catalog.
package catalog

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"sort"

	data "devserver/api/catalog"
)

type Region struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Tag         string `json:"tag"`
	MinLevel    int    `json:"minLevel"`
	Description string `json:"description"`
}

type DeployType struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Glyph string `json:"glyph"`
}

type DeployLevel struct {
	Level    int `json:"level"`
	MinLevel int `json:"minLevel"`
	Minutes  int `json:"minutes"`
	XP       int `json:"xp"`
	Coins    int `json:"coins"`
	Gems     int `json:"gems"`
}

type Catalog struct {
	Version      string
	Regions      []Region
	DeployTypes  []DeployType
	DeployLevels []DeployLevel
	body         []byte
}

func Load() (*Catalog, error) {
	names, err := fs.Glob(data.Files, "*.json")
	if err != nil {
		return nil, err
	}
	sort.Strings(names)
	h := sha256.New()
	for _, n := range names {
		b, err := data.Files.ReadFile(n)
		if err != nil {
			return nil, err
		}
		fmt.Fprintf(h, "%s\x00", n)
		h.Write(b)
	}
	c := &Catalog{Version: hex.EncodeToString(h.Sum(nil))[:16]}

	raw, err := data.Files.ReadFile("regions.json")
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, &c.Regions); err != nil {
		return nil, fmt.Errorf("regions.json: %w", err)
	}

	raw, err = data.Files.ReadFile("deploys.json")
	if err != nil {
		return nil, err
	}
	var deploys struct {
		Types  []DeployType  `json:"types"`
		Levels []DeployLevel `json:"levels"`
	}
	if err := json.Unmarshal(raw, &deploys); err != nil {
		return nil, fmt.Errorf("deploys.json: %w", err)
	}
	c.DeployTypes, c.DeployLevels = deploys.Types, deploys.Levels

	c.body, err = json.Marshal(struct {
		Version      string        `json:"version"`
		Regions      []Region      `json:"regions"`
		DeployTypes  []DeployType  `json:"deployTypes"`
		DeployLevels []DeployLevel `json:"deployLevels"`
	}{c.Version, c.Regions, c.DeployTypes, c.DeployLevels})
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (c *Catalog) Region(id string) (Region, bool) {
	for _, r := range c.Regions {
		if r.ID == id {
			return r, true
		}
	}
	return Region{}, false
}

func (c *Catalog) DeployType(id string) (DeployType, bool) {
	for _, t := range c.DeployTypes {
		if t.ID == id {
			return t, true
		}
	}
	return DeployType{}, false
}

func (c *Catalog) DeployLevel(level int) (DeployLevel, bool) {
	for _, l := range c.DeployLevels {
		if l.Level == level {
			return l, true
		}
	}
	return DeployLevel{}, false
}

func (c *Catalog) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	etag := `"` + c.Version + `"`
	w.Header().Set("ETag", etag)
	w.Header().Set("Cache-Control", "no-cache")
	if r.Header.Get("If-None-Match") == etag {
		w.WriteHeader(http.StatusNotModified)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(c.body)
}
