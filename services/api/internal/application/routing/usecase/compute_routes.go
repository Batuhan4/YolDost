package usecase

import (
	"context"
	"strings"

	"github.com/Batuhan4/hackcursor/services/api/internal/domain/routing/model"
	"github.com/Batuhan4/hackcursor/services/api/internal/domain/routing/repository"
	domainErr "github.com/Batuhan4/hackcursor/services/api/internal/shared/errors"
)

// ComputeRoutesUseCase retrieves live alternatives. Physical re-ranking is
// applied only when segment analysis coverage exists; zero coverage remains
// explicit instead of manufacturing a safety score.
type ComputeRoutesUseCase struct {
	provider repository.WalkingRouteProvider
}

func NewComputeRoutesUseCase(provider repository.WalkingRouteProvider) *ComputeRoutesUseCase {
	return &ComputeRoutesUseCase{provider: provider}
}

func (uc *ComputeRoutesUseCase) Execute(ctx context.Context, request model.ComputeRoutesRequest) (model.ComputeRoutesResponse, error) {
	if err := validate(request); err != nil {
		return model.ComputeRoutesResponse{}, err
	}
	if request.Preference == "" {
		request.Preference = model.PreferenceBalanced
	}

	routes, err := uc.provider.ComputeWalkingRoutes(ctx, request.Origin, request.Destination)
	if err != nil {
		return model.ComputeRoutesResponse{}, err
	}

	return model.ComputeRoutesResponse{
		Preference:      request.Preference,
		Routes:          routes,
		Attribution:     "Google Maps",
		Disclaimer:      "Rota onerileri fiziksel cevre gostergelerine dayanir; gercek dunya guvenligi garanti edilmez.",
		GeneratedLive:   true,
		PersistentCache: false,
	}, nil
}

func validate(request model.ComputeRoutesRequest) error {
	if !validCoordinate(request.Origin) || !validCoordinate(request.Destination) {
		return domainErr.New(domainErr.ErrValidation, "origin and destination must be a valid address or WGS84 coordinate", nil)
	}
	switch request.Preference {
	case "", model.PreferenceBalanced, model.PreferenceOpen, model.PreferenceSidewalk, model.PreferenceGreen, model.PreferenceActive:
		return nil
	default:
		return domainErr.New(domainErr.ErrValidation, "unsupported route preference", nil)
	}
}

func validCoordinate(coordinate model.Coordinate) bool {
	if address := strings.TrimSpace(coordinate.Address); address != "" {
		return len(address) <= 256
	}
	return coordinate.Lat >= -90 && coordinate.Lat <= 90 &&
		coordinate.Lng >= -180 && coordinate.Lng <= 180 &&
		(coordinate.Lat != 0 || coordinate.Lng != 0)
}
