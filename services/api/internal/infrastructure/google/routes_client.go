// Package google implements Google Maps Platform adapters.
package google

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Batuhan4/hackcursor/services/api/internal/domain/routing/model"
	"github.com/Batuhan4/hackcursor/services/api/internal/domain/routing/repository"
	domainErr "github.com/Batuhan4/hackcursor/services/api/internal/shared/errors"
)

const (
	computeRoutesURL = "https://routes.googleapis.com/directions/v2:computeRoutes"
	routeFieldMask   = "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.routeLabels"
)

// RoutesClient calls Google Routes API without persisting responses.
type RoutesClient struct {
	apiKey string
	client *http.Client
}

var _ repository.WalkingRouteProvider = (*RoutesClient)(nil)

func NewRoutesClient(apiKey string) *RoutesClient {
	return &RoutesClient{
		apiKey: apiKey,
		client: &http.Client{Timeout: 12 * time.Second},
	}
}

type computeRequest struct {
	Origin                   waypoint `json:"origin"`
	Destination              waypoint `json:"destination"`
	TravelMode               string   `json:"travelMode"`
	ComputeAlternativeRoutes bool     `json:"computeAlternativeRoutes"`
	LanguageCode             string   `json:"languageCode"`
	Units                    string   `json:"units"`
}

type waypoint struct {
	Location location `json:"location"`
}

type location struct {
	LatLng latLng `json:"latLng"`
}

type latLng struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type computeResponse struct {
	Routes []struct {
		DistanceMeters int      `json:"distanceMeters"`
		Duration       string   `json:"duration"`
		RouteLabels    []string `json:"routeLabels"`
		Polyline       struct {
			EncodedPolyline string `json:"encodedPolyline"`
		} `json:"polyline"`
	} `json:"routes"`
}

func (c *RoutesClient) ComputeWalkingRoutes(ctx context.Context, origin, destination model.Coordinate) ([]model.RouteOption, error) {
	if c.apiKey == "" {
		return nil, domainErr.New(domainErr.ErrNotImplemented, "Google Routes API key is not configured", nil)
	}

	payload := computeRequest{
		Origin:                   point(origin),
		Destination:              point(destination),
		TravelMode:               "WALK",
		ComputeAlternativeRoutes: true,
		LanguageCode:             "tr-TR",
		Units:                    "METRIC",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "encode Google Routes request", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, computeRoutesURL, bytes.NewReader(body))
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "create Google Routes request", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Goog-Api-Key", c.apiKey)
	req.Header.Set("X-Goog-FieldMask", routeFieldMask)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "Google Routes request failed", err)
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "read Google Routes response", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, domainErr.New(domainErr.ErrInternal, fmt.Sprintf("Google Routes returned HTTP %d", resp.StatusCode), nil)
	}

	var decoded computeResponse
	if err := json.Unmarshal(responseBody, &decoded); err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "decode Google Routes response", err)
	}
	if len(decoded.Routes) == 0 {
		return nil, domainErr.New(domainErr.ErrNotFound, "no walking route found", nil)
	}

	routes := make([]model.RouteOption, 0, len(decoded.Routes))
	for index, route := range decoded.Routes {
		duration, err := durationSeconds(route.Duration)
		if err != nil {
			return nil, domainErr.New(domainErr.ErrInternal, "invalid Google route duration", err)
		}
		routes = append(routes, model.RouteOption{
			ID:                   fmt.Sprintf("google-walk-%d", index+1),
			DistanceMeters:       route.DistanceMeters,
			DurationSeconds:      duration,
			EncodedPolyline:      route.Polyline.EncodedPolyline,
			GoogleRouteLabels:    route.RouteLabels,
			AnalysisCoverage:     0,
			OmniSightScore:       nil,
			RecommendationStatus: "insufficient_analysis_coverage",
			Explanation:          nil,
		})
	}
	return routes, nil
}

func point(coordinate model.Coordinate) waypoint {
	return waypoint{Location: location{LatLng: latLng{
		Latitude: coordinate.Lat, Longitude: coordinate.Lng,
	}}}
}

func durationSeconds(value string) (int, error) {
	seconds := strings.TrimSuffix(value, "s")
	parsed, err := strconv.ParseFloat(seconds, 64)
	if err != nil {
		return 0, err
	}
	return int(parsed + 0.5), nil
}
