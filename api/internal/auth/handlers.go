package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
)

// Config points the OAuth flow at GitHub; the URLs are overridable so tests and e2e can use a fake.
type Config struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	AuthURL      string
	TokenURL     string
	APIURL       string
	CookieSecure bool
}

func (c Config) oauth() *oauth2.Config {
	endpoint := github.Endpoint
	if c.AuthURL != "" {
		endpoint.AuthURL = c.AuthURL
	}
	if c.TokenURL != "" {
		endpoint.TokenURL = c.TokenURL
	}
	endpoint.AuthStyle = oauth2.AuthStyleInParams
	return &oauth2.Config{
		ClientID:     c.ClientID,
		ClientSecret: c.ClientSecret,
		RedirectURL:  c.RedirectURL,
		Endpoint:     endpoint,
	}
}

func (c Config) apiURL() string {
	if c.APIURL != "" {
		return c.APIURL
	}
	return "https://api.github.com"
}

type Handlers struct {
	Config   Config
	Sessions Sessions
	Logger   *slog.Logger
}

func (h *Handlers) cookie(name, value string, maxAge int) *http.Cookie {
	return &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   h.Config.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	}
}

func (h *Handlers) Login(w http.ResponseWriter, r *http.Request) error {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return err
	}
	state := hex.EncodeToString(b)
	http.SetCookie(w, h.cookie(StateCookie, state, stateMaxAge))
	http.Redirect(w, r, h.Config.oauth().AuthCodeURL(state), http.StatusFound)
	return nil
}

func (h *Handlers) Callback(w http.ResponseWriter, r *http.Request) error {
	http.SetCookie(w, h.cookie(StateCookie, "", -1))

	state := r.URL.Query().Get("state")
	c, err := r.Cookie(StateCookie)
	if err != nil || state == "" || subtle.ConstantTimeCompare([]byte(c.Value), []byte(state)) != 1 {
		http.Redirect(w, r, "/login?error=state", http.StatusFound)
		return nil
	}

	id, err := h.fetchIdentity(r, r.URL.Query().Get("code"))
	if err != nil {
		h.Logger.Warn("github login failed", "error", err.Error())
		http.Redirect(w, r, "/login?error=github", http.StatusFound)
		return nil
	}

	token, err := h.Sessions.Create(r.Context(), id)
	if err != nil {
		return err
	}
	http.SetCookie(w, h.cookie(SessionCookie, token, SessionMaxAge))
	http.Redirect(w, r, "/", http.StatusFound)
	return nil
}

func (h *Handlers) fetchIdentity(r *http.Request, code string) (Identity, error) {
	tok, err := h.Config.oauth().Exchange(r.Context(), code)
	if err != nil {
		return Identity{}, fmt.Errorf("exchange code: %w", err)
	}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, h.Config.apiURL()+"/user", nil)
	if err != nil {
		return Identity{}, err
	}
	req.Header.Set("Authorization", "Bearer "+tok.AccessToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return Identity{}, fmt.Errorf("get user: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return Identity{}, fmt.Errorf("get user: status %d", resp.StatusCode)
	}
	var u struct {
		ID    int64  `json:"id"`
		Login string `json:"login"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&u); err != nil {
		return Identity{}, fmt.Errorf("decode user: %w", err)
	}
	if u.ID == 0 || u.Login == "" {
		return Identity{}, fmt.Errorf("github user without id or login")
	}
	return Identity{GithubUserID: u.ID, GithubLogin: u.Login}, nil
}

func (h *Handlers) Logout(w http.ResponseWriter, r *http.Request) error {
	c, err := r.Cookie(SessionCookie)
	if err == nil {
		if err := h.Sessions.Delete(r.Context(), c.Value); err != nil {
			return err
		}
	}
	http.SetCookie(w, h.cookie(SessionCookie, "", -1))
	w.WriteHeader(http.StatusNoContent)
	return nil
}
