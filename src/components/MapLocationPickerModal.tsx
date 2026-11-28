import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { springSmooth } from "../utils/motion";
import { useFocusTrap } from "../hooks/useFocusTrap";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { MapPin, Navigation, Search, Check, X, Compass, Loader2 } from "lucide-react";
import GoogleMapsProvider from "./GoogleMapsProvider";

interface MapLocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: number | null;
  initialLng?: number | null;
  onSaveLocation: (lat: number, lng: number, formattedAddress?: string) => void;
  title?: string;
}

const DADU_CENTER = { lat: 26.7323, lng: 67.7744 };

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Pink teardrop pin, same look as the old Google AdvancedMarker pin.
// Inline styles (not Tailwind classes) because Leaflet injects this HTML at
// runtime via innerHTML — inline styles always render, no build scanning needed.
const PIN_HTML = `<div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:grab" title="Drag pin to adjust location"><div style="width:40px;height:40px;background:#E21B70;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1)"><div style="width:14px;height:14px;background:#fff;border-radius:50%"></div></div><div style="width:12px;height:6px;background:rgba(0,0,0,.25);border-radius:50%;filter:blur(1px);margin-top:2px"></div></div>`;

function makePinIcon() {
  return L.divIcon({
    html: PIN_HTML,
    className: "",
    iconSize: [40, 48],
    iconAnchor: [20, 40],
  });
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

function buildSearchQuery(raw: string) {
  const trimmed = raw.trim();
  return trimmed.toLowerCase().includes("dadu")
    ? trimmed
    : `${trimmed}, Dadu, Sindh, Pakistan`;
}

async function searchNominatim(query: string): Promise<NominatimResult[]> {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=pk&q=" +
    encodeURIComponent(buildSearchQuery(query));
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error("Nominatim search failed");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) return null;
  const data = await res.json();
  return typeof data?.display_name === "string" ? data.display_name : null;
}

function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    // The map pane is flex-sized, so its box can change after mount
    // (error banner appearing, keyboard, rotation). Without this Leaflet
    // keeps the old size and paints grey tiles over the new area.
    if (typeof ResizeObserver === "undefined") {
      map.invalidateSize();
      return;
    }
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function MapCameraController({
  targetPosition,
  panTrigger,
}: {
  targetPosition: { lat: number; lng: number };
  panTrigger: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (panTrigger === 0) return;
    map.panTo([targetPosition.lat, targetPosition.lng]);
    const currentZoom = map.getZoom() ?? 15;
    if (currentZoom < 15) {
      map.setZoom(16);
    }
  }, [map, targetPosition, panTrigger]);

  return null;
}

function MapClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

function NominatimSearch({
  onSelectLocation,
  onError,
}: {
  onSelectLocation: (lat: number, lng: number, label?: string) => void;
  onError: (msg: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      // A stale "not found" error must not linger once the user starts over.
      onError("");
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        onError("");
        const results = await searchNominatim(trimmed);
        if (!cancelled) {
          setSuggestions(results);
          setShowDropdown(results.length > 0);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setShowDropdown(false);
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, onError]);

  const handleSelectSuggestion = async (item: NominatimResult) => {
    const nextLat = Number(Number(item.lat).toFixed(6));
    const nextLng = Number(Number(item.lon).toFixed(6));
    if (isNaN(nextLat) || isNaN(nextLng)) {
      onError("Selected place had no coordinates. Tap directly on the map to set the pin.");
      return;
    }
    setQuery(item.display_name || "");
    setSuggestions([]);
    setShowDropdown(false);
    onSelectLocation(nextLat, nextLng, item.display_name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      await handleSelectSuggestion(suggestions[0]);
      return;
    }
    if (!query.trim()) return;
    setIsSearching(true);
    onError("");
    try {
      const results = await searchNominatim(query.trim());
      const first = results?.[0];
      if (first) {
        const nextLat = Number(Number(first.lat).toFixed(6));
        const nextLng = Number(Number(first.lon).toFixed(6));
        if (!isNaN(nextLat) && !isNaN(nextLng)) {
          onSelectLocation(nextLat, nextLng, first.display_name || query.trim());
        } else {
          onError("Location not found. Tap directly on the map to place the pin.");
        }
      } else {
        onError("Location not found. Tap directly on the map to place the pin.");
      }
    } catch {
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
            aria-label="Search area, road, or landmark in Dadu"
            autoComplete="off"
            className="w-full min-h-[44px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#E21B70]/40 transition"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="min-h-[44px] bg-[#E21B70] hover:bg-[#C2145E] text-white px-4 py-2 rounded-xl text-xs font-bold transition-transform duration-180 active:scale-[0.97] active:brightness-110 relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-all after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100 shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
        </button>
      </form>

      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 animate-fade-in">
          {suggestions.map((item) => {
            const label = item.display_name || "";
            if (!label) return null;
            return (
              <li key={item.place_id}>
                <button
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-[#FDF2F6] dark:hover:bg-[#2A121D] flex items-center gap-2.5 cursor-pointer transition-transform duration-180 active:scale-[0.97] active:brightness-110"
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

function InteractiveLeafletMapView({
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
  const pinIcon = useMemo(() => makePinIcon(), []);
  // Memoised so MapCameraController's effect only fires when the pin
  // actually moves — before this, every parent re-render (e.g. the
  // reverse-geocode label arriving) rebuilt the object and yanked the
  // map back to the pin while the user was panning around to look.
  const targetPosition = useMemo(() => ({ lat, lng }), [lat, lng]);

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      // Absolute fill (NOT height:100%): the parent is a flex item whose
      // height comes from min-h/flex, and a percentage height does NOT
      // resolve against it — Leaflet measured 0px tall (blank grey map)
      // even though the parent is 240px. inset:0 fills the relative
      // parent exactly, whatever height flex gives it.
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      <MapResizeHandler />
      <MapCameraController targetPosition={targetPosition} panTrigger={panTrigger} />
      <MapClickHandler onPick={onPickCoords} />
      <Marker
        position={[lat, lng]}
        icon={pinIcon}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const ll = (e.target as L.Marker).getLatLng();
            onPickCoords(Number(ll.lat.toFixed(6)), Number(ll.lng.toFixed(6)));
          },
        }}
      />
    </MapContainer>
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
  const reverseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPickRef = useRef<{ lat: number; lng: number }>({ lat: defaultLat, lng: defaultLng });

  useEffect(() => {
    if (isOpen) {
      const validLat = initialLat && !isNaN(initialLat) ? initialLat : DADU_CENTER.lat;
      const validLng = initialLng && !isNaN(initialLng) ? initialLng : DADU_CENTER.lng;
      setLat(validLat);
      setLng(validLng);
      latestPickRef.current = { lat: validLat, lng: validLng };
      setSelectedLabel(undefined);
      setSearchError("");
      setPanTrigger((n) => n + 1);
    }
  }, [isOpen, initialLat, initialLng]);

  // Focus trap + ESC to close (a11y fix 27 Nov 2026) — replaces the old
  // ESC-only listener. Must sit above the `if (!isOpen) return null`
  // below so the hook order never changes.
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef, isOpen, onClose);

  // Clear any pending reverse-geocode on unmount so it never writes state
  // after the modal is gone.
  useEffect(() => {
    return () => {
      if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
    };
  }, []);

  // Best-effort reverse-geocode: fills the address label for pins placed by
  // tapping/dragging/GPS. Never blocks saving; never overwrites a search label.
  const scheduleReverseGeocode = useCallback((nextLat: number, nextLng: number) => {
    if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
    reverseTimerRef.current = setTimeout(async () => {
      try {
        const label = await reverseGeocode(nextLat, nextLng);
        if (!label) return;
        // Only apply if the pin has not moved on since this lookup started.
        if (
          latestPickRef.current.lat === nextLat &&
          latestPickRef.current.lng === nextLng
        ) {
          setSelectedLabel(label);
        }
      } catch {
        // Best-effort only; ignore failures.
      }
    }, 600);
  }, []);

  const handleSelectPosition = useCallback(
    (nextLat: number, nextLng: number, label?: string) => {
      if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
      setLat(nextLat);
      setLng(nextLng);
      latestPickRef.current = { lat: nextLat, lng: nextLng };
      if (label) {
        setSelectedLabel(label);
      } else {
        scheduleReverseGeocode(nextLat, nextLng);
      }
      setPanTrigger((n) => n + 1);
    },
    [scheduleReverseGeocode]
  );

  // Map tap / marker drag: move the pin and reverse-geocode the label.
  const handlePickCoords = useCallback(
    (nextLat: number, nextLng: number) => {
      if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
      setLat(nextLat);
      setLng(nextLng);
      latestPickRef.current = { lat: nextLat, lng: nextLng };
      scheduleReverseGeocode(nextLat, nextLng);
    },
    [scheduleReverseGeocode]
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
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-5 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={springSmooth}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/80 shrink-0">
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
            className="w-12 h-12 min-h-[48px] min-w-[48px] flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-full transition-transform duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer shrink-0"
            title="Close"
            aria-label="Close map picker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <GoogleMapsProvider>
          {/* Search & GPS Toolbar */}
          <div className="p-3 sm:p-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800/60 space-y-2 shrink-0">
            <div className="flex gap-2 items-start">
              <NominatimSearch
                onSelectLocation={handleSelectPosition}
                onError={setSearchError}
              />

              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="min-h-[44px] bg-[#FDF2F6] dark:bg-[#2A121D] text-[#E21B70] dark:text-[#FF4D94] hover:opacity-90 px-3.5 py-2 rounded-xl text-xs font-bold transition-transform duration-180 active:scale-[0.97] active:brightness-110 flex items-center gap-1.5 cursor-pointer shrink-0 border border-[#E21B70]/25 disabled:opacity-60"
                title="Use current GPS position"
                aria-label="Use my current GPS location"
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
              <p role="alert" className="text-[11px] text-rose-500 font-bold px-1 animate-fade-in">{searchError}</p>
            )}
          </div>

          {/* Leaflet Map View — flex-sized (not a fixed height) so the footer
              can never be pushed off-screen on short phones; MapResizeHandler
              keeps Leaflet's tiles in sync when this box changes size. */}
          <div className="relative w-full flex-1 min-h-[240px] bg-zinc-200 dark:bg-zinc-800 shrink-0">
            <InteractiveLeafletMapView
              lat={lat}
              lng={lng}
              panTrigger={panTrigger}
              onPickCoords={handlePickCoords}
            />

            {/* Instruction Pill Overlay */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-zinc-900/90 text-white px-3 py-1.5 rounded-full text-[11px] font-bold shadow-lg backdrop-blur-md flex items-center gap-1.5 pointer-events-none whitespace-nowrap">
              <Compass className="w-3.5 h-3.5 text-[#FF4D94]" />
              <span>Tap map or drag pin to choose position</span>
            </div>
          </div>
        </GoogleMapsProvider>

        {/* Selected Coordinates Footer & Actions */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
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
              className="min-h-[48px] px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E21B70]/50 transition-transform duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => {
                onSaveLocation(lat, lng, selectedLabel);
                onClose();
              }}
              className="min-h-[48px] px-5 py-2 rounded-xl bg-[#E21B70] hover:bg-[#C2145E] text-white text-xs font-bold shadow-sm transition-transform duration-180 active:scale-[0.97] active:brightness-110 relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-all after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100 flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E21B70]/50"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Save Location</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
