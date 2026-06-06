package gateway_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Batuhan4/hackcursor/services/api/internal/application/inventory/usecase"
	routingUseCase "github.com/Batuhan4/hackcursor/services/api/internal/application/routing/usecase"
	routingModel "github.com/Batuhan4/hackcursor/services/api/internal/domain/routing/model"
	"github.com/Batuhan4/hackcursor/services/api/internal/gateway"
	"github.com/Batuhan4/hackcursor/services/api/internal/gateway/handlers"
	"github.com/Batuhan4/hackcursor/services/api/internal/infrastructure/memory"
	"github.com/Batuhan4/hackcursor/services/api/internal/shared/config"
	"github.com/Batuhan4/hackcursor/services/api/internal/shared/logger"
)

// newTestRouter wires the full router exactly like cmd/server does, with the
// deterministic fixture repository.
func newTestRouter(t *testing.T) http.Handler {
	t.Helper()

	cfg := config.Load()
	log := logger.New("error", "text")
	repo := memory.NewInventoryRepository()

	return gateway.NewRouter(gateway.Dependencies{
		Logger:        log,
		Config:        cfg,
		HealthHandler: handlers.NewHealthHandler(false),
		InventoryHandler: handlers.NewInventoryHandler(
			usecase.NewListDemoRunsUseCase(repo),
			usecase.NewListDetectionsUseCase(repo),
			usecase.NewListStreetAnalysesUseCase(repo),
		),
		RoutesHandler: handlers.NewRoutesHandler(
			routingUseCase.NewComputeRoutesUseCase(fakeRouteProvider{}),
		),
	})
}

type fakeRouteProvider struct{}

func (fakeRouteProvider) ComputeWalkingRoutes(ctx context.Context, origin, destination routingModel.Coordinate) ([]routingModel.RouteOption, error) {
	return []routingModel.RouteOption{
		{
			ID:                   "google-walk-1",
			DistanceMeters:       826,
			DurationSeconds:      741,
			EncodedPolyline:      "encoded",
			GoogleRouteLabels:    []string{"DEFAULT_ROUTE"},
			AnalysisCoverage:     0,
			OmniSightScore:       nil,
			RecommendationStatus: "insufficient_analysis_coverage",
		},
	}, nil
}

func TestListStreetAnalyses(t *testing.T) {
	router := newTestRouter(t)
	rec, body := get(t, router, "/api/v1/street-analyses")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var payload struct {
		Data []struct {
			SourceLabel                string  `json:"source_label"`
			BuiltDensityPct            float64 `json:"built_density_pct"`
			PedestrianComfortPotential float64 `json:"pedestrian_comfort_potential"`
		} `json:"data"`
		Count int `json:"count"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if payload.Count != 6 {
		t.Fatalf("count = %d, want 6", payload.Count)
	}
	for _, item := range payload.Data {
		if item.SourceLabel == "" {
			t.Error("source label must be explicit")
		}
		if item.BuiltDensityPct < 0 || item.BuiltDensityPct > 100 {
			t.Errorf("built density out of range: %f", item.BuiltDensityPct)
		}
		if item.PedestrianComfortPotential < 0 || item.PedestrianComfortPotential > 100 {
			t.Errorf("comfort potential out of range: %f", item.PedestrianComfortPotential)
		}
	}
}

func TestComputeRoutesReturnsLiveAlternativesWithoutInventedScore(t *testing.T) {
	router := newTestRouter(t)
	body := []byte(`{
		"origin":{"lat":41.0151,"lng":28.8689},
		"destination":{"lat":41.0192,"lng":28.8725},
		"preference":"balanced"
	}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/routes", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rec.Code, rec.Body.String())
	}
	var payload routingModel.ComputeRoutesResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if len(payload.Routes) != 1 {
		t.Fatalf("route count = %d, want 1", len(payload.Routes))
	}
	if payload.Routes[0].OmniSightScore != nil {
		t.Fatal("score must be null when physical analysis coverage is zero")
	}
	if payload.Routes[0].RecommendationStatus != "insufficient_analysis_coverage" {
		t.Errorf("unexpected recommendation status: %s", payload.Routes[0].RecommendationStatus)
	}
	if payload.PersistentCache {
		t.Error("Google route responses must not be persistently cached")
	}
}

func get(t *testing.T, router http.Handler, path string) (*httptest.ResponseRecorder, []byte) {
	t.Helper()

	req := httptest.NewRequest(http.MethodGet, path, nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	body, err := io.ReadAll(rec.Body)
	if err != nil {
		t.Fatalf("reading body: %v", err)
	}
	return rec, body
}

func TestHealthLive(t *testing.T) {
	router := newTestRouter(t)

	rec, body := get(t, router, "/health/live")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}

	var payload map[string]string
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if payload["status"] != "alive" {
		t.Errorf("status = %q, want alive", payload["status"])
	}
}

func TestHealthReady(t *testing.T) {
	router := newTestRouter(t)

	rec, body := get(t, router, "/health/ready")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}

	var payload handlers.HealthResponse
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if payload.Status != "ready" {
		t.Errorf("status = %q, want ready", payload.Status)
	}
	if payload.Services["database"] != "not_configured" {
		t.Errorf("database service = %q, want not_configured", payload.Services["database"])
	}
}

func TestListDemoRuns(t *testing.T) {
	router := newTestRouter(t)

	rec, body := get(t, router, "/api/v1/demo-runs")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}

	var payload struct {
		Data []struct {
			ID                    string `json:"id"`
			Status                string `json:"status"`
			AnonymizedRegionCount int    `json:"anonymized_region_count"`
		} `json:"data"`
		Count int `json:"count"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if payload.Count == 0 || len(payload.Data) == 0 {
		t.Fatal("expected at least one demo run in fixture data")
	}
	if payload.Data[0].ID != "demo-fixture-0001" {
		t.Errorf("run id = %q, want demo-fixture-0001", payload.Data[0].ID)
	}
}

func TestListDetections(t *testing.T) {
	router := newTestRouter(t)

	rec, body := get(t, router, "/api/v1/detections")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}

	var payload struct {
		Data []struct {
			ObjectClass string  `json:"object_class"`
			Confidence  float64 `json:"confidence"`
		} `json:"data"`
		Count int `json:"count"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if payload.Count != 7 {
		t.Errorf("count = %d, want 7 fixture detections", payload.Count)
	}

	// KVKK guard: the API must never serve person/face/plate classes.
	for _, d := range payload.Data {
		switch d.ObjectClass {
		case "person", "face", "license_plate", "plate":
			t.Errorf("forbidden object class served: %q", d.ObjectClass)
		}
		if d.Confidence < 0 || d.Confidence > 1 {
			t.Errorf("confidence out of range: %f", d.Confidence)
		}
	}
}

func TestListDetectionsFilteredByRun(t *testing.T) {
	router := newTestRouter(t)

	rec, body := get(t, router, "/api/v1/detections?demo_run_id=demo-fixture-0001")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var payload struct {
		Count int `json:"count"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if payload.Count != 7 {
		t.Errorf("count = %d, want 7 for fixture run", payload.Count)
	}

	rec, body = get(t, router, "/api/v1/detections?demo_run_id=no-such-run")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if payload.Count != 0 {
		t.Errorf("count = %d, want 0 for unknown run", payload.Count)
	}
}

func TestUnknownRouteReturnsJSON404(t *testing.T) {
	router := newTestRouter(t)

	rec, body := get(t, router, "/api/v1/nope")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("404 body must be JSON: %v", err)
	}
}

func TestRequestIDHeaderSet(t *testing.T) {
	router := newTestRouter(t)

	rec, _ := get(t, router, "/health/live")
	if rec.Header().Get("X-Request-ID") == "" {
		t.Error("X-Request-ID header missing")
	}
}
