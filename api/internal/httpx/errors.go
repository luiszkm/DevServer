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
	ErrUnauthenticated  = &Error{http.StatusUnauthorized, "unauthenticated", "sessão ausente ou expirada"}
	ErrPlayerNotFound   = &Error{http.StatusNotFound, "player_not_found", "jogador não encontrado"}
	ErrPlayerExists     = &Error{http.StatusConflict, "player_exists", "este usuário GitHub já tem um dev"}
	ErrInvalidDevName   = &Error{http.StatusUnprocessableEntity, "invalid_dev_name", "o nome deve ter de 3 a 16 caracteres entre A-Z, 0-9 e _"}
	ErrDevNameTaken     = &Error{http.StatusConflict, "dev_name_taken", "nome já em uso"}
	ErrInvalidClass     = &Error{http.StatusUnprocessableEntity, "invalid_class", "classe inválida"}
	ErrLevelTooLow      = &Error{http.StatusUnprocessableEntity, "level_too_low", "nível insuficiente para esta região"}
	ErrUnknownRegion    = &Error{http.StatusUnprocessableEntity, "unknown_region", "região desconhecida"}
	ErrInternal         = &Error{http.StatusInternalServerError, "internal", "erro interno"}
	ErrNotFound         = &Error{http.StatusNotFound, "not_found", "rota não encontrada"}
	ErrMethodNotAllowed = &Error{http.StatusMethodNotAllowed, "method_not_allowed", "método não permitido"}
	ErrInvalidBody      = &Error{http.StatusUnprocessableEntity, "invalid_body", "corpo da requisição inválido"}
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
