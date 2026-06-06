package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/Batuhan4/hackcursor/services/api/internal/application/routing/usecase"
	"github.com/Batuhan4/hackcursor/services/api/internal/domain/routing/model"
	"github.com/Batuhan4/hackcursor/services/api/internal/shared/response"
)

// RoutesHandler serves live walking alternatives.
type RoutesHandler struct {
	computeRoutes *usecase.ComputeRoutesUseCase
}

func NewRoutesHandler(computeRoutes *usecase.ComputeRoutesUseCase) *RoutesHandler {
	return &RoutesHandler{computeRoutes: computeRoutes}
}

func (h *RoutesHandler) Compute(w http.ResponseWriter, r *http.Request) {
	var request model.ComputeRoutesRequest
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]any{
			"error": "Bad Request", "message": "invalid route request", "code": http.StatusBadRequest,
		})
		return
	}

	result, err := h.computeRoutes.Execute(r.Context(), request)
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, result)
}
