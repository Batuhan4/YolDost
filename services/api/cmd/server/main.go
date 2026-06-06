// Command server runs the Urban Object Inventory API, following the
// masterfabric-go cmd/server pattern: load config, build dependencies,
// serve with graceful shutdown.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Batuhan4/hackcursor/services/api/internal/application/inventory/usecase"
	routingUseCase "github.com/Batuhan4/hackcursor/services/api/internal/application/routing/usecase"
	"github.com/Batuhan4/hackcursor/services/api/internal/gateway"
	"github.com/Batuhan4/hackcursor/services/api/internal/gateway/handlers"
	googleInfra "github.com/Batuhan4/hackcursor/services/api/internal/infrastructure/google"
	"github.com/Batuhan4/hackcursor/services/api/internal/infrastructure/memory"
	"github.com/Batuhan4/hackcursor/services/api/internal/shared/config"
	"github.com/Batuhan4/hackcursor/services/api/internal/shared/logger"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	// Load configuration.
	cfg := config.Load()

	// Initialize logger.
	log := logger.New(cfg.Log.Level, cfg.Log.Format)
	slog.SetDefault(log)

	log.Info("starting omnisight-street-intelligence api",
		"host", cfg.Server.Host,
		"port", cfg.Server.Port,
	)

	// Report which secrets are configured — names and booleans only,
	// values are never logged (AGENTS.md rule).
	for name, present := range cfg.SecretPresence() {
		log.Info("secret presence", "name", name, "present", present)
	}

	// Build dependencies.
	deps := buildDependencies(log, cfg)

	// Build router.
	r := gateway.NewRouter(deps)

	// Create HTTP server.
	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	// Graceful shutdown.
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	serverErr := make(chan error, 1)
	go func() {
		log.Info("listening", "addr", addr)
		serverErr <- srv.ListenAndServe()
	}()

	select {
	case err := <-serverErr:
		if err != nil && err != http.ErrServerClosed {
			return fmt.Errorf("server error: %w", err)
		}
	case sig := <-shutdown:
		log.Info("shutdown signal received", "signal", sig.String())
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			_ = srv.Close()
			return fmt.Errorf("graceful shutdown failed: %w", err)
		}
		log.Info("server stopped gracefully")
	}

	return nil
}

func buildDependencies(log *slog.Logger, cfg *config.Config) gateway.Dependencies {
	// Scaffold stage: serve deterministic fixture data from the in-memory
	// repository so the demo always works. internal/infrastructure/postgres
	// holds the Render Postgres skeleton; switch here once DATABASE_URL
	// wiring lands (migrations/0001_init.sql has the schema).
	repo := memory.NewInventoryRepository()
	if cfg.Database.URL != "" {
		log.Info("DATABASE_URL configured but postgres adapter is pending — serving fixture data")
	}

	listDemoRuns := usecase.NewListDemoRunsUseCase(repo)
	listDetections := usecase.NewListDetectionsUseCase(repo)
	listStreetAnalyses := usecase.NewListStreetAnalysesUseCase(repo)
	computeRoutes := routingUseCase.NewComputeRoutesUseCase(
		googleInfra.NewRoutesClient(cfg.Google.APIKey),
	)

	return gateway.Dependencies{
		Logger:           log,
		Config:           cfg,
		HealthHandler:    handlers.NewHealthHandler(cfg.Database.URL != ""),
		InventoryHandler: handlers.NewInventoryHandler(listDemoRuns, listDetections, listStreetAnalyses),
		RoutesHandler:    handlers.NewRoutesHandler(computeRoutes),
	}
}
