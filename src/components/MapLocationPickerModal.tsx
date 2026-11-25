import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
  useApiLoadingStatus,
  APILoadingStatus,
} from "@vis.gl/react-google-maps";
import { MapPin, Navigation, Search, Check, X, Compass, Loader2, AlertTriangle } from "lucide-react";
import GoogleMapsProvider, {
  isQuotaOrRateLimitError,
  notifyMapsQuotaExceeded,
} from "./GoogleMapsProvider";

interface MapLocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: number | null;
  initialLng?: number | null;
  onSaveLocation: (lat: number, lng: number, formattedAddress?: string) => void;
  title?: string;
}

const DADU_CENTER = { lat: 26.7323, lng: 67.7744 };

function MapCameraController({
  targetPosition,
  panTrigger,
}: {
  targetPosition: { lat: number; lng: number };
  panTrigger: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || panTrigger === 0) return;
    map.panTo(targetPosition);
    const currentZoom = map.getZoom() ?? 15;
    if (currentZoom < 15) {
      map.setZoom(16);
    }
  }, [map, targetPosition, panTrigger]);

  return null;
}

function PlacesAutocompleteSearch({
  onSelectLocation,
  onError,
}: {
  onSelectLocation: (lat: number, lng: number, label?: string) => void;
  onError: (msg: string) => void;
}) {
  const placesLib = useMapsLibrary("places");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSuggestions([]);
    setShowDropdown(false);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!placesLib || trimmed.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        onError("");
        const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }

        const request: google.maps.places.AutocompleteRequest = {
          input: trimmed,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ["pk"],
          locationBias: {
            center: DADU_CENTER,
            radius: 18000,
          },
        };

        const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        if (!cancelled) {
          setSuggestions(response.suggestions || []);
          setShowDropdown((response.suggestions || []).length > 0);
        }
      } catch (err) {
        if (!cancelled) {
          if (isQuotaOrRateLimitError(err)) {
            notifyMapsQuotaExceeded();
          }
          setSuggestions([]);
          setShowDropdown(false);
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [placesLib, query, onError]);

  const handleSelectSuggestion = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!suggestion.placePrediction) return;
    setIsSearching(true);
    onError("");
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ["location", "formattedAddress", "displayName"],
      });

      const loc = place.location;
      if (loc) {
        const nextLat = Number(loc.lat().toFixed(6));
        const nextLng = Number(loc.lng().toFixed(6));
        const label =
          place.formattedAddress ||
          place.displayName ||
          suggestion.placePrediction.text.text;
        setQuery(label || "");
        onSelectLocation(nextLat, nextLng, label);
      } else {
        onError("Selected place had no coordinates. Tap directly on the map to set the pin.");
      }
    } catch (err) {
      if (isQuotaOrRateLimitError(err)) {
        notifyMapsQuotaExceeded();
      }
      onError("Could not load place details. Tap directly on the map to place your pin.");
    } finally {
      setIsSearching(false);
      resetSession();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      await handleSelectSuggestion(suggestions[0]);
      return;
    }
    if (!placesLib || !query.trim()) return;
    setIsSearching(true);
    onError("");
    try {
      const { Place } = placesLib;
      const result = await Place.searchByText({
        textQuery: query.toLowerCase().includes("dadu")
          ? query.trim()
          : `${query.trim()}, Dadu, Sindh, Pakistan`,
        fields: ["location", "formattedAddress", "displayName"],
        locationBias: {
          center: DADU_CENTER,
          radius: 18000,
        },
        maxResultCount: 1,
      });
      const firstPlace = result.places?.[0];
      if (firstPlace?.location) {
        const nextLat = Number(firstPlace.location.lat().toFixed(6));
        const nextLng = Number(firstPlace.location.lng().toFixed(6));
        onSelectLocation(
          nextLat,
          nextLng,
          firstPlace.formattedAddress || firstPlace.displayName || query.trim()
        );
      } else {
        onError("Location not found. Tap directly on the map to place the pin.");
      }
    } catch (err) {
      if (isQuotaOrRateLimitError(err)) {
        notifyMapsQuotaExceeded();
      }
      onError("Could not search right now. Tap directly on the map to place the pin.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative flex-1">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
            placeholder="Search area, road, or landmark in Dadu..."
            className="w-full min-h-[44px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#E21B70]/40 transition"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="min-h-[44px] bg-[#E21B70] hover:bg-[#C2145E] text-white px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
        </button>
      </form>

      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
          {suggestions.map((item, idx) => {
            const label = item.placePrediction?.text.text || "";
            if (!label) return null;
            return (
              <li key={item.placePrediction?.placeId || idx}>
                <button
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-[#FDF2F6] dark:hover:bg-[#2A121D] flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#E21B70] shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function InteractiveGoogleMapView({
  lat,
  lng,
  panTrigger,
  onPickCoords,
}: {
  lat: number;
  lng: number;
  panTrigger: number;
  onPickCoords: (nextLat: number, nextLng: number) => void;
}) {
  const status = useApiLoadingStatus();

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-100 dark:bg-zinc-900">
        <AlertTriangle className="w-8 h-8 text-[#E21B70] mb-2" />
        <p className="text-sm font-bold text-zinc-900 dark:text-white">
          Unable to load Google Maps right now
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
          Please check your network or use the &ldquo;My GPS&rdquo; button above to capture exact coordinates.
        </p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapId="DEMO_MAP_ID"
      defaultCenter={{ lat, lng }}
      defaultZoom={15}
      gestureHandling="greedy"
      streetViewControl={false}
      mapTypeControl={false}
      fullscreenControl={false}
      internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
      style={{ width: "100%", height: "100%" }}
      onClick={(ev) => {
        const clicked = ev.detail.latLng;
        if (!clicked) return;
        onPickCoords(Number(clicked.lat.toFixed(6)), Number(clicked.lng.toFixed(6)));
      }}
    >
      <MapCameraController targetPosition={{ lat, lng }} panTrigger={panTrigger} />
      <AdvancedMarker
        position={{ lat, lng }}
        draggable={true}
        onDragEnd={(ev) => {
          const pos = ev.latLng;
          if (!pos) return;
          onPickCoords(Number(pos.lat().toFixed(6)), Number(pos.lng().toFixed(6)));
        }}
      >
        <div
          className="relative flex flex-col items-center cursor-grab active:cursor-grabbing"
          title="Drag pin to adjust location"
        >
          <div className="w-10 h-10 bg-[#E21B70] border-[3px] border-white rounded-full rounded-bl-none -rotate-45 flex items-center justify-center shadow-lg">
            <div className="w-3.5 h-3.5 bg-white rounded-full" />
          </div>
          <div className="w-3 h-1.5 bg-black/25 rounded-full blur-[1px] mt-0.5" />
        </div>
      </AdvancedMarker>
    </GoogleMap>
  );
}

export default function MapLocationPickerModal({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  onSaveLocation,
  title = "Select Location on Map",
}: MapLocationPickerModalProps) {
  const defaultLat = initialLat && !isNaN(initialLat) ? initialLat : DADU_CENTER.lat;
  const defaultLng = initialLng && !isNaN(initialLng) ? initialLng : DADU_CENTER.lng;

  const [lat, setLat] = useState<number>(defaultLat);
  const [lng, setLng] = useState<number>(defaultLng);
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>(undefined);
  const [panTrigger, setPanTrigger] = useState<number>(0);
  const [searchError, setSearchError] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const validLat = initialLat && !isNaN(initialLat) ? initialLat : DADU_CENTER.lat;
      const validLng = initialLng && !isNaN(initialLng) ? initialLng : DADU_CENTER.lng;
      setLat(validLat);
      setLng(validLng);
      setSelectedLabel(undefined);
      setSearchError("");
      setPanTrigger((n) => n + 1);
    }
  }, [isOpen, initialLat, initialLng]);

  const handleSelectPosition = useCallback(
    (nextLat: number, nextLng: number, label?: string) => {
      setLat(nextLat);
      setLng(nextLng);
      if (label) setSelectedLabel(label);
      setPanTrigger((n) => n + 1);
    },
    []
  );

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSearchError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setSearchError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const userLat = Number(pos.coords.latitude.toFixed(6));
        const userLng = Number(pos.coords.longitude.toFixed(6));
        handleSelectPosition(userLat, userLng);
      },
      () => {
        setIsLocating(false);
        setSearchError("Could not fetch GPS location. Please tap on the map to set the pin.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#E21B70]/10 text-[#E21B70] rounded-2xl">
              <MapPin className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-zinc-900 dark:text-white leading-tight">
                {title}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold">
                Tap map, search an area, or drag the pin to set exact coordinates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-full transition cursor-pointer"
            title="Close"
            aria-label="Close map picker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <GoogleMapsProvider>
          {/* Search & GPS Toolbar */}
          <div className="p-3 sm:p-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800/60 space-y-2">
            <div className="flex gap-2 items-start">
              <PlacesAutocompleteSearch
                onSelectLocation={handleSelectPosition}
                onError={setSearchError}
              />

              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="min-h-[44px] bg-[#FDF2F6] dark:bg-[#2A121D] text-[#E21B70] dark:text-[#FF4D94] hover:opacity-90 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 border border-[#E21B70]/25"
                title="Use current GPS position"
              >
                {isLocating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#E21B70]" />
                ) : (
                  <Navigation className="w-4 h-4 fill-current" />
                )}
                <span className="hidden sm:inline">My GPS</span>
              </button>
            </div>

            {searchError && (
              <p className="text-[11px] text-rose-500 font-bold px-1">{searchError}</p>
            )}
          </div>

          {/* Google Map View (explicit CSS height to prevent 0x0 collapse) */}
          <div className="relative w-full h-[320px] sm:h-[380px] bg-zinc-200 dark:bg-zinc-800 shrink-0">
            <InteractiveGoogleMapView
              lat={lat}
              lng={lng}
              panTrigger={panTrigger}
              onPickCoords={(nextLat, nextLng) => {
                setLat(nextLat);
                setLng(nextLng);
              }}
            />

            {/* Instruction Pill Overlay */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-zinc-900/90 text-white px-3 py-1.5 rounded-full text-[11px] font-bold shadow-lg backdrop-blur-md flex items-center gap-1.5 pointer-events-none whitespace-nowrap">
              <Compass className="w-3.5 h-3.5 text-[#FF4D94]" />
              <span>Tap map or drag pin to choose position</span>
            </div>
          </div>
        </GoogleMapsProvider>

        {/* Selected Coordinates Footer & Actions */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-3 min-w-0">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                Selected Pinpoint Coords
              </span>
              <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white block truncate">
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </span>
              {selectedLabel && (
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">
                  {selectedLabel}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => {
                onSaveLocation(lat, lng, selectedLabel);
                onClose();
              }}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#E21B70] hover:bg-[#C2145E] text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Save Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
