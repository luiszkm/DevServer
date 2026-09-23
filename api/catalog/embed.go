// Package catalog holds the game balance data embedded into the api binary.
package catalog

import "embed"

//go:embed *.json
var Files embed.FS
