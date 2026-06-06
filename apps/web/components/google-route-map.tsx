"use client";

import { useEffect, useRef, useState } from "react";

import type { RouteOption } from "@/lib/routes";

import DemoMap from "./demo-map";
import styles from "./google-route-map.module.css";

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

type GoogleMapsNamespace = typeof google.maps;

let mapsLoader: Promise<GoogleMapsNamespace> | null = null;

function loadGoogleMaps(apiKey: string): Promise<GoogleMapsNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps is browser-only"));
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (!mapsLoader) {
    mapsLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.maps) {
          resolve(window.google.maps);
          return;
        }
        reject(new Error("Google Maps script loaded without maps namespace"));
      };
      script.onerror = () => reject(new Error("Google Maps script failed to load"));
      document.head.appendChild(script);
    });
  }
  return mapsLoader;
}

interface GoogleRouteMapProps {
  routes: RouteOption[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
}

export default function GoogleRouteMap(props: GoogleRouteMapProps) {
  if (!MAPS_API_KEY) {
    return <DemoMap {...props} />;
  }
  return <GoogleRouteMapInner {...props} />;
}

function GoogleRouteMapInner({
  routes,
  selectedRouteId,
  onSelectRoute,
}: GoogleRouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<{
    polylines: google.maps.Polyline[];
    markers: google.maps.Marker[];
  }>({ polylines: [], markers: [] });
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      try {
        const maps = await loadGoogleMaps(MAPS_API_KEY);
        if (cancelled || !containerRef.current) return;

        if (!mapRef.current) {
          mapRef.current = new maps.Map(containerRef.current, {
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            gestureHandling: "greedy",
          });
        }
        if (!cancelled) {
          setMapState("ready");
        }
      } catch {
        if (!cancelled) {
          setMapState("error");
        }
      }
    }

    void initMap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== "ready") return;

    overlaysRef.current.polylines.forEach((line) => line.setMap(null));
    overlaysRef.current.markers.forEach((marker) => marker.setMap(null));
    overlaysRef.current = { polylines: [], markers: [] };

    if (routes.length === 0) {
      map.setCenter({ lat: 41.0192, lng: 28.8725 });
      map.setZoom(14);
      return;
    }

    const bounds = new google.maps.LatLngBounds();

    routes.forEach((route) => {
      const selected = route.id === selectedRouteId;
      route.geoPath.forEach((point) => bounds.extend(point));

      const polyline = new google.maps.Polyline({
        path: route.geoPath,
        map,
        strokeColor: selected ? "#1f6f4a" : "#6b7c93",
        strokeOpacity: selected ? 1 : 0.65,
        strokeWeight: selected ? 6 : 4,
        zIndex: selected ? 2 : 1,
        clickable: true,
      });
      polyline.addListener("click", () => onSelectRoute(route.id));
      overlaysRef.current.polylines.push(polyline);
    });

    const selectedRoute =
      routes.find((route) => route.id === selectedRouteId) ?? routes[0];
    const start = selectedRoute?.geoPath[0];
    const end = selectedRoute?.geoPath[selectedRoute.geoPath.length - 1];

    if (start) {
      overlaysRef.current.markers.push(
        new google.maps.Marker({
          map,
          position: start,
          label: "A",
          title: "Başlangıç",
        }),
      );
    }
    if (end) {
      overlaysRef.current.markers.push(
        new google.maps.Marker({
          map,
          position: end,
          label: "B",
          title: "Varış",
        }),
      );
    }

    map.fitBounds(bounds, 48);
  }, [routes, selectedRouteId, onSelectRoute, mapState]);

  if (mapState === "error") {
    return <DemoMap routes={routes} selectedRouteId={selectedRouteId} onSelectRoute={onSelectRoute} />;
  }

  return (
    <div className={styles.wrap}>
      <div ref={containerRef} className={styles.map} aria-hidden={mapState !== "ready"} />
      {mapState === "loading" && (
        <span className={styles.overlay}>Google Haritalar yükleniyor…</span>
      )}
      <span className={styles.tag}>Canlı Google Haritalar · rota geometrisi</span>
    </div>
  );
}
