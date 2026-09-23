// Package auth owns GitHub OAuth login and the opaque session behind the ds_session cookie.
package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"devserver/api/internal/httpx"
)

const (
	SessionCookie = "ds_session"
	StateCookie   = "ds_oauth_state"
	// SessionMaxAge is the session lifetime in seconds (30 days, no sliding renewal).
	SessionMaxAge = 2592000
	stateMaxAge   = 600
)

// Identity is the GitHub user behind a session.
type Identity struct {
	GithubUserID int64
	GithubLogin  string
}

type Sessions struct {
	Pool *pgxpool.Pool
}

// HashToken is what the sessions table stores instead of the cookie value.
func HashToken(token string) []byte {
	sum := sha256.Sum256([]byte(token))
	return sum[:]
}

func (s Sessions) Create(ctx context.Context, id Identity) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	token := base64.RawURLEncoding.EncodeToString(b)
	_, err := s.Pool.Exec(ctx,
		`INSERT INTO sessions (token_hash, github_user_id, github_login) VALUES ($1, $2, $3)`,
		HashToken(token), id.GithubUserID, id.GithubLogin)
	if err != nil {
		return "", err
	}
	return token, nil
}

// Lookup returns the identity of a session younger than SessionMaxAge.
func (s Sessions) Lookup(ctx context.Context, token string) (Identity, bool, error) {
	var id Identity
	err := s.Pool.QueryRow(ctx,
		`SELECT github_user_id, github_login FROM sessions
		 WHERE token_hash = $1 AND created_at > now() - make_interval(secs => $2)`,
		HashToken(token), SessionMaxAge).Scan(&id.GithubUserID, &id.GithubLogin)
	if errors.Is(err, pgx.ErrNoRows) {
		return Identity{}, false, nil
	}
	if err != nil {
		return Identity{}, false, err
	}
	return id, true, nil
}

func (s Sessions) Delete(ctx context.Context, token string) error {
	_, err := s.Pool.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, HashToken(token))
	return err
}

type ctxKey int

const identityKey ctxKey = iota

// IdentityFrom returns the identity RequireSession attached to the request.
func IdentityFrom(ctx context.Context) Identity {
	id, _ := ctx.Value(identityKey).(Identity)
	return id
}

// RequireSession answers 401 unless the request carries a valid ds_session cookie.
func RequireSession(s Sessions) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			c, err := r.Cookie(SessionCookie)
			if err != nil || c.Value == "" {
				httpx.WriteError(w, httpx.ErrUnauthenticated)
				return
			}
			id, ok, err := s.Lookup(r.Context(), c.Value)
			if err != nil {
				httpx.WriteError(w, err)
				return
			}
			if !ok {
				httpx.WriteError(w, httpx.ErrUnauthenticated)
				return
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), identityKey, id)))
		})
	}
}
