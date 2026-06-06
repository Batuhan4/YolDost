// Package handlers contains the HTTP handlers exposed by the gateway,
// following the masterfabric-go handler pattern (thin handlers that delegate
// to application use cases and reply via shared/response).
package handlers

import (
	"net/http"

	"github.com/Batuhan4/hackcursor/services/api/internal/shared/response"
)

// HealthHandler provides liveness and readiness probes for Render.
type HealthHandler struct {
	databaseConfigured bool
}

// NewHealthHandler creates a health handler.
// databaseConfigured reports whether DATABASE_URL is set (presence only).
func NewHealthHandler(databaseConfigured bool) *HealthHandler {
	return &HealthHandler{databaseConfigured: databaseConfigured}
}

// HealthResponse is the JSON structure for health checks.
type HealthResponse struct {
	Status   string            `json:"status"`
	Services map[string]string `json:"services"`
}

// Liveness returns 200 if the server is alive.
func (h *HealthHandler) Liveness(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, map[string]string{"status": "alive"})
}

// Readiness reports dependency status. At scaffold stage the API may serve the
// deterministic fixture repository; clients display this source explicitly so
// fixture-backed data is not mistaken for production Postgres data.
func (h *HealthHandler) Readiness(w http.ResponseWriter, r *http.Request) {
	services := map[string]string{
		"repository": "fixture (deterministic demo data)",
	}
	if h.databaseConfigured {
		services["database"] = "configured (connection wiring pending)"
	} else {
		services["database"] = "not_configured"
	}

	response.JSON(w, http.StatusOK, HealthResponse{
		Status:   "ready",
		Services: services,
	})
}
