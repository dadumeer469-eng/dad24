import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapPin, Navigation, Search, Check, X, Compass, Loader2 } from "lucide-react";

interface MapLocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: number | null;
  initialLng?: number | null;
  onSaveLocation: (lat: number, lng: number) => void;
  title?: string;
}

export default function MapLocationPickerModal({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  onSaveLocation,
  title = "Select Restaurant Location on Map"
}: MapLocationPickerModalProps) {
  // Default coordinates fallback (Dadu City Center)
  const defaultLat = initialLat && !isNaN(initialLat) ? initialLat : 26.7323;
  const defaultLng = initialLng && !isNaN(initialLng) ? initialLng : 67.7744;

  const [lat, setLat] = useState<number>(defaultLat);
  const [lng, setLng] = useState<number>(defaultLng);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);

  // Sync initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      const validLat = initialLat && !isNaN(initialLat) ? initialLat : 26.7323;
      const validLng = initialLng && !isNaN(initialLng) ? initialLng : 67.7744;
      setLat(validLat);
      setLng(validLng);
      setSearchError("");
    }
  }, [isOpen, initialLat, initialLng]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Destroy previous map instance if exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Reset container DOM flag
    if ((mapContainerRef.current as any)._leaflet_id) {
      (mapContainerRef.current as any)._leaflet_id = null;
    }

    const currentLat = lat;
    const currentLng = lng;

    const map = L.map(mapContainerRef.current, {
      center: [currentLat, currentLng],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Custom Pin Icon
    const customIcon = L.divIcon({
      className: "custom-map-picker-pin",
      html: `
        <div style="
          width: 38px;
          height: 38px;
          background-color: #D70F64;
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(215, 15, 100, 0.4);
        ">
          <div style="
            width: 14px;
            height: 14px;
            background-color: white;
            border-radius: 50%;
          "></div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 38],
    });

    const marker = L.marker([currentLat, currentLng], {
      icon: customIcon,
      draggable: true,
    }).addTo(map);

    markerInstanceRef.current = marker;
    mapInstanceRef.current = map;

    // Update lat/lng on marker drag
    marker.on("dragend", (e) => {
      const position = e.target.getLatLng();
      setLat(Number(position.lat.toFixed(6)));
      setLng(Number(position.lng.toFixed(6)));
    });

    // Update marker on map click
    map.on("click", (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      const roundedLat = Number(clickLat.toFixed(6));
      const roundedLng = Number(clickLng.toFixed(6));

      marker.setLatLng([roundedLat, roundedLng]);
      setLat(roundedLat);
      setLng(roundedLng);
    });

    // Trigger map resize after render animation
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Update marker position when lat/lng state changes from GPS or search
  const updateMapPosition = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);

    if (markerInstanceRef.current) {
      markerInstanceRef.current.setLatLng([newLat, newLng]);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([newLat, newLng], 16, { duration: 1.2 });
    }
  };

  // Get current device GPS location
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
        updateMapPosition(userLat, userLng);
      },
      (err) => {
        setIsLocating(false);
        setSearchError("Could not fetch GPS location. Please select manually on map.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Search location using Nominatim API
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError("");

    try {
      const query = searchQuery.includes("Dadu") ? searchQuery : `${searchQuery}, Dadu, Sindh, Pakistan`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data && data.length > 0) {
        const foundLat = Number(parseFloat(data[0].lat).toFixed(6));
        const foundLng = Number(parseFloat(data[0].lon).toFixed(6));
        updateMapPosition(foundLat, foundLng);
      } else {
        setSearchError("Location not found. Please click directly on the map.");
      }
    } catch (err) {
      setSearchError("Search error. Click directly on the map to set location.");
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#D70F64]/10 text-[#D70F64] rounded-2xl">
              <MapPin className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-zinc-900 dark:text-white leading-tight">
                {title}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold">
                Click map or drag the pin to set exact store location
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-full transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & GPS Toolbar */}
        <div className="p-3 sm:p-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800/60 space-y-2">
          <form onSubmit={handleSearchLocation} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search location or area name..."
                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#D70F64]/40 transition"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3.5 py-2 rounded-xl text-xs font-black hover:opacity-90 transition shrink-0 flex items-center gap-1 cursor-pointer"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
            </button>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={isLocating}
              className="bg-[#D70F64]/10 text-[#D70F64] hover:bg-[#D70F64]/20 px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Use current GPS position"
            >
              {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D70F64]" /> : <Navigation className="w-3.5 h-3.5 fill-[#D70F64]" />}
              <span className="hidden sm:inline">My GPS</span>
            </button>
          </form>

          {searchError && (
            <p className="text-[11px] text-rose-500 font-bold px-1">{searchError}</p>
          )}
        </div>

        {/* Map View */}
        <div className="relative flex-1 min-h-[320px] sm:min-h-[380px] bg-zinc-200 dark:bg-zinc-800">
          <div ref={mapContainerRef} className="w-full h-full min-h-[320px] sm:min-h-[380px] z-10" />
          
          {/* Instruction Pill Overlay */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-zinc-900/90 text-white px-3 py-1.5 rounded-full text-[11px] font-extrabold shadow-lg backdrop-blur-md flex items-center gap-1.5 pointer-events-none">
            <Compass className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
            <span>Tap map or drag pin to choose position</span>
          </div>
        </div>

        {/* Selected Coordinates Footer & Actions */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-3">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                Selected Pinpoint Coords
              </span>
              <span className="font-mono text-xs font-black text-zinc-900 dark:text-white">
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-xs font-black text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => {
                onSaveLocation(lat, lng);
                onClose();
              }}
              className="px-5 py-2.5 rounded-2xl bg-[#D70F64] hover:bg-[#b00c50] text-white text-xs font-black shadow-lg shadow-pink-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
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
