// Package gateway builds the HTTP router, following the masterfabric-go
// router pattern: a Dependencies struct is injected and all middleware/routes
// are declared in one place.
package gateway

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

	"github.com/Batuhan4/hackcursor/services/api/internal/gateway/handlers"
	"github.com/Batuhan4/hackcursor/services/api/internal/shared/config"
	"github.com/Batuhan4/hackcursor/services/api/internal/shared/middleware"
)

// Dependencies holds all injected dependencies for the router.
type Dependencies struct {
	Logger *slog.Logger
	Config *config.Config

	HealthHandler    *handlers.HealthHandler
	InventoryHandler *handlers.InventoryHandler
	RoutesHandler    *handlers.RoutesHandler
}

// NewRouter creates the root chi router with all middleware and routes.
// Auth is intentionally absent at MVP stage: the API serves only anonymized,
// non-personal inventory data (see AGENTS.md scope).
func NewRouter(deps Dependencies) *chi.Mux {
	r := chi.NewRouter()

	// Global middleware (masterfabric-go order: request id, logging, recovery, CORS).
	r.Use(middleware.RequestID)
	r.Use(middleware.Logging(deps.Logger))
	r.Use(middleware.Recoverer(deps.Logger))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: deps.Config.CORS.AllowedOrigins,
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Content-Type", "X-Request-ID"},
		ExposedHeaders: []string{"X-Request-ID"},
		MaxAge:         300,
	}))

	// Health endpoints (Render health checks hit /health/live).
	r.Get("/health/live", deps.HealthHandler.Liveness)
	r.Get("/health/ready", deps.HealthHandler.Readiness)

	// API v1 routes.
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/demo-runs", deps.InventoryHandler.ListDemoRuns)
		r.Get("/detections", deps.InventoryHandler.ListDetections)
		r.Get("/street-analyses", deps.InventoryHandler.ListStreetAnalyses)
		r.Post("/routes", deps.RoutesHandler.Compute)
	})

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`{"error":"not found","code":404}`))
	})

	return r
}
