// Package fakegithub is a stand-in for GitHub's OAuth and /user endpoints, used by the
// api tests and by the e2e stack. It is never mounted by the real api.
package fakegithub

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"sync"
)

type User struct {
	ID    int64  `json:"id"`
	Login string `json:"login"`
}

type Server struct {
	mu        sync.Mutex
	next      User
	codes     map[string]User
	tokens    map[string]User
	failToken bool
	failUser  bool
	userBody  string
	dropUser  bool
	mux       *http.ServeMux
}

func New() *Server {
	s := &Server{next: User{ID: 1, Login: "octocat"}, codes: map[string]User{}, tokens: map[string]User{}}
	s.mux = http.NewServeMux()
	s.mux.HandleFunc("GET /login/oauth/authorize", s.authorize)
	s.mux.HandleFunc("POST /login/oauth/access_token", s.accessToken)
	s.mux.HandleFunc("GET /user", s.user)
	s.mux.HandleFunc("POST /fake/next-user", s.setNext)
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) { s.mux.ServeHTTP(w, r) }

func random() string {
	b := make([]byte, 12)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// IssueCode returns an authorization code that exchanges for u.
func (s *Server) IssueCode(u User) string {
	s.mu.Lock()
	defer s.mu.Unlock()
	code := random()
	s.codes[code] = u
	return code
}

func (s *Server) SetNextUser(u User) {
	s.mu.Lock()
	s.next = u
	s.mu.Unlock()
}

func (s *Server) FailToken(v bool) {
	s.mu.Lock()
	s.failToken = v
	s.mu.Unlock()
}

func (s *Server) FailUser(v bool) {
	s.mu.Lock()
	s.failUser = v
	s.mu.Unlock()
}

// DropUserConnection makes GET /user close the connection without answering (transport error).
func (s *Server) DropUserConnection(v bool) {
	s.mu.Lock()
	s.dropUser = v
	s.mu.Unlock()
}

// SetUserBody makes GET /user answer 200 with this raw body instead of the real user.
func (s *Server) SetUserBody(body string) {
	s.mu.Lock()
	s.userBody = body
	s.mu.Unlock()
}

func (s *Server) authorize(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	next := s.next
	s.mu.Unlock()
	target, err := url.Parse(r.URL.Query().Get("redirect_uri"))
	if err != nil {
		http.Error(w, "bad redirect_uri", http.StatusBadRequest)
		return
	}
	q := target.Query()
	q.Set("code", s.IssueCode(next))
	q.Set("state", r.URL.Query().Get("state"))
	target.RawQuery = q.Encode()
	http.Redirect(w, r, target.String(), http.StatusFound)
}

func (s *Server) accessToken(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.failToken {
		http.Error(w, "token failure", http.StatusInternalServerError)
		return
	}
	u, ok := s.codes[r.FormValue("code")]
	if !ok {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "bad_verification_code"})
		return
	}
	delete(s.codes, r.FormValue("code"))
	token := random()
	s.tokens[token] = u
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"access_token": token, "token_type": "bearer", "scope": ""})
}

func (s *Server) user(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.dropUser {
		if hj, ok := w.(http.Hijacker); ok {
			if conn, _, err := hj.Hijack(); err == nil {
				_ = conn.Close()
				return
			}
		}
	}
	if s.failUser {
		http.Error(w, "user failure", http.StatusInternalServerError)
		return
	}
	u, ok := s.tokens[strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")]
	if !ok {
		http.Error(w, "bad credentials", http.StatusUnauthorized)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if s.userBody != "" {
		_, _ = w.Write([]byte(s.userBody))
		return
	}
	_ = json.NewEncoder(w).Encode(u)
}

func (s *Server) setNext(w http.ResponseWriter, r *http.Request) {
	var u User
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil || u.ID == 0 || u.Login == "" {
		http.Error(w, "bad user", http.StatusBadRequest)
		return
	}
	s.SetNextUser(u)
	w.WriteHeader(http.StatusNoContent)
}
