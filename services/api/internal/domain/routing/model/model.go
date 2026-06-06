// Package model defines consumer walking-route contracts.
package model

// Coordinate is a WGS84 point.
type Coordinate struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// RoutePreference describes how analyzed physical indicators should be weighted.
type RoutePreference string

const (
	PreferenceBalanced RoutePreference = "balanced"
	PreferenceOpen     RoutePreference = "open"
	PreferenceSidewalk RoutePreference = "sidewalk"
	PreferenceGreen    RoutePreference = "green"
	PreferenceActive   RoutePreference = "active_frontage"
)

// ComputeRoutesRequest asks for live walking alternatives.
type ComputeRoutesRequest struct {
	Origin      Coordinate      `json:"origin"`
	Destination Coordinate      `json:"destination"`
	Preference  RoutePreference `json:"preference"`
}

// RouteOption is one Google walking alternative with optional OmniSight analysis.
type RouteOption struct {
	ID                   string   `json:"id"`
	DistanceMeters       int      `json:"distance_meters"`
	DurationSeconds      int      `json:"duration_seconds"`
	EncodedPolyline      string   `json:"encoded_polyline"`
	GoogleRouteLabels    []string `json:"google_route_labels"`
	AnalysisCoverage     float64  `json:"analysis_coverage"`
	OmniSightScore       *float64 `json:"omnisight_score"`
	RecommendationStatus string   `json:"recommendation_status"`
	Explanation          *string  `json:"explanation"`
}

// ComputeRoutesResponse returns uncached Google alternatives.
type ComputeRoutesResponse struct {
	Preference      RoutePreference `json:"preference"`
	Routes          []RouteOption   `json:"routes"`
	Attribution     string          `json:"attribution"`
	Disclaimer      string          `json:"disclaimer"`
	GeneratedLive   bool            `json:"generated_live"`
	PersistentCache bool            `json:"persistent_cache"`
}
