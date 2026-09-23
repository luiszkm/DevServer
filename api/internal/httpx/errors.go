// Package httpx holds the api's HTTP contract: the error envelope, JSON helpers and
// the middleware every route shares.
package httpx

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
)

// Error is an api error rendered as {"error":{"code":...,"message":...}}.
type Error struct {
	Status  int
	Code    string
	Message string
}

func (e *Error) Error() string { return e.Code }

var (
	ErrUnauthenticated    = &Error{http.StatusUnauthorized, "unauthenticated", "sessão ausente ou expirada"}
	ErrPlayerNotFound     = &Error{http.StatusNotFound, "player_not_found", "jogador não encontrado"}
	ErrPlayerExists       = &Error{http.StatusConflict, "player_exists", "este usuário GitHub já tem um dev"}
	ErrInvalidDevName     = &Error{http.StatusUnprocessableEntity, "invalid_dev_name", "o nome deve ter de 3 a 16 caracteres entre A-Z, 0-9 e _"}
	ErrDevNameTaken       = &Error{http.StatusConflict, "dev_name_taken", "nome já em uso"}
	ErrInvalidClass       = &Error{http.StatusUnprocessableEntity, "invalid_class", "classe inválida"}
	ErrLevelTooLow        = &Error{http.StatusUnprocessableEntity, "level_too_low", "nível insuficiente"}
	ErrUnknownRegion      = &Error{http.StatusUnprocessableEntity, "unknown_region", "região desconhecida"}
	ErrInternal           = &Error{http.StatusInternalServerError, "internal", "erro interno"}
	ErrNotFound           = &Error{http.StatusNotFound, "not_found", "rota não encontrada"}
	ErrMethodNotAllowed   = &Error{http.StatusMethodNotAllowed, "method_not_allowed", "método não permitido"}
	ErrInvalidBody        = &Error{http.StatusUnprocessableEntity, "invalid_body", "corpo da requisição inválido"}
	ErrDeployRunning      = &Error{http.StatusConflict, "deploy_running", "já existe um deploy deste tipo em andamento"}
	ErrDeployNotReady     = &Error{http.StatusConflict, "deploy_not_ready", "o deploy ainda não terminou"}
	ErrDeployNotFound     = &Error{http.StatusNotFound, "deploy_not_found", "nenhum deploy deste tipo em andamento"}
	ErrUnknownDeployType  = &Error{http.StatusUnprocessableEntity, "unknown_deploy_type", "tipo de deploy desconhecido"}
	ErrUnknownDeployLevel = &Error{http.StatusUnprocessableEntity, "unknown_deploy_level", "nível de deploy desconhecido"}
	ErrSkillLocked        = &Error{http.StatusConflict, "skill_locked", "desbloqueie a habilidade anterior da trilha primeiro"}
	ErrSkillUnlocked      = &Error{http.StatusConflict, "skill_already_unlocked", "habilidade já está ativa"}
	ErrNoSkillPoints      = &Error{http.StatusConflict, "no_skill_points", "sem pontos de habilidade. suba de nível com deploys"}
	ErrUnknownSkill       = &Error{http.StatusUnprocessableEntity, "unknown_skill", "habilidade desconhecida"}
	ErrBattleNotFound     = &Error{http.StatusNotFound, "battle_not_found", "nenhum encontro em andamento"}
	ErrBattleOver         = &Error{http.StatusConflict, "battle_over", "o bug já foi resolvido. comece um novo encontro"}
	ErrNotEnoughSP        = &Error{http.StatusConflict, "not_enough_sp", "SP insuficiente. use uma poção"}
	ErrCommandLocked      = &Error{http.StatusConflict, "command_locked", "desbloqueie a skill para usar este comando"}
	ErrNoItem             = &Error{http.StatusConflict, "no_item", "você não tem este item"}
	ErrUnknownCommand     = &Error{http.StatusUnprocessableEntity, "unknown_command", "comando desconhecido"}
	ErrUnknownItem        = &Error{http.StatusUnprocessableEntity, "unknown_item", "item desconhecido ou não usável em combate"}
	ErrUnknownShopItem    = &Error{http.StatusUnprocessableEntity, "unknown_item", "item desconhecido"}
	ErrNotEnoughGems      = &Error{http.StatusConflict, "not_enough_gems", "gems insuficientes"}
	ErrNotEnoughCoins     = &Error{http.StatusConflict, "not_enough_coins", "coins insuficientes"}
	ErrAlreadyOwned       = &Error{http.StatusConflict, "already_owned", "você já possui este item"}
	ErrNotForSale         = &Error{http.StatusUnprocessableEntity, "not_for_sale", "este item não está à venda"}
	ErrUnknownGear        = &Error{http.StatusUnprocessableEntity, "unknown_gear", "equipamento desconhecido"}
	ErrUnknownSkin        = &Error{http.StatusUnprocessableEntity, "unknown_skin", "skin desconhecida"}
	ErrNotOwned           = &Error{http.StatusConflict, "not_owned", "você não possui este item. compre na Loja"}
	ErrDeployReady        = &Error{http.StatusConflict, "deploy_ready", "o deploy já terminou. colete a recompensa"}
)

type envelope struct {
	Error envelopeBody `json:"error"`
}

type envelopeBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// WriteError renders err in the error envelope; anything that is not an *Error is internal.
func WriteError(w http.ResponseWriter, err error) {
	var e *Error
	if !errors.As(err, &e) {
		e = ErrInternal
	}
	WriteJSON(w, e.Status, envelope{envelopeBody{e.Code, e.Message}})
}

func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// DecodeJSON reads the request body into v, mapping any decode failure to ErrInvalidBody.
func DecodeJSON(r *http.Request, v any) error {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		return ErrInvalidBody
	}
	return nil
}

// HandlerFunc is a handler that reports failure by returning an error.
type HandlerFunc func(w http.ResponseWriter, r *http.Request) error

// Handle adapts fn, logging unexpected errors with the request id before answering 500.
func Handle(logger *slog.Logger, fn HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		err := fn(w, r)
		if err == nil {
			return
		}
		var e *Error
		if !errors.As(err, &e) {
			logger.Error("request failed", "request_id", RequestIDFrom(r.Context()), "error", err.Error())
		}
		WriteError(w, err)
	}
}
