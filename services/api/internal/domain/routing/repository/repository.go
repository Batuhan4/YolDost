// Package repository defines external routing ports.
package repository

import (
	"context"

	"github.com/Batuhan4/hackcursor/services/api/internal/domain/routing/model"
)

// WalkingRouteProvider returns live walking alternatives.
type WalkingRouteProvider interface {
	ComputeWalkingRoutes(ctx context.Context, origin, destination model.Coordinate) ([]model.RouteOption, error)
}
