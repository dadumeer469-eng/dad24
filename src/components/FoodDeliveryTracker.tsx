import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { getDatabase, ref, onValue, off } from "firebase/database";
import { app } from "../firebase";
import {
  CheckCircle2,
  Navigation,
  MapPin,
  Bike,
  WifiOff,
  AlertTriangle,
  Clock,
  UtensilsCrossed,
  ShoppingBag,
  ChefHat,
  Receipt,
  Sparkles,
} from "lucide-react";

interface Coords {
  latitude: number;
  longitude: number;
}

interface FoodDeliveryTrackerProps {
  orderId: string;
  orderStatus: string; // e.g. "out_for_delivery", "DELIVERED", "preparing", "accepted", "pending"
  destinationCoords: Coords;
  riderName?: string;
  initialRiderCoords?: Coords;
  onClose?: () => void;
  restaurantName?: string;
  items?: { name: string; quantity: number; price: number }[];
  grandTotal?: number;
}

export default function FoodDeliveryTracker({
  orderId,
  orderStatus,
  destinationCoords,
  riderName = "Foodpanda Hero",
  initialRiderCoords,
  onClose,
  restaurantName,
  items,
  grandTotal,
}: FoodDeliveryTrackerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // Position state refs for smooth animation
  const currentRiderPosRef = useRef<[number, number]>([
    initialRiderCoords?.latitude || destinationCoords.latitude + 0.012,
    initialRiderCoords?.longitude || destinationCoords.longitude + 0.012,
  ]);
  const animFrameIdRef = useRef<number | null>(null);

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("Waiting for update...");
  const [isConnectedToRTDB, setIsConnectedToRTDB] = useState<boolean>(false);
  const [isRiderOnline, setIsRiderOnline] = useState<boolean>(false);
  const [hasReceivedRiderData, setHasReceivedRiderData] = useState<boolean>(false);
  const [isLiveTrackingEnabled, setIsLiveTrackingEnabled] = useState<boolean>(true);

  // Listen to admin setting at /settings/live_tracking_enabled
  useEffect(() => {
    let settingsRef: any = null;
    try {
      const rtdb = getDatabase(app);
      settingsRef = ref(rtdb, "settings/live_tracking_enabled");
      const unsubscribe = onValue(settingsRef, (snapshot) => {
        const val = snapshot.val();
        setIsLiveTrackingEnabled(val === null ? true : Boolean(val));
      });
      return () => {
        off(settingsRef);
      };
    } catch (e) {
      console.warn("RTDB settings listener error:", e);
    }
  }, []);

  const normalizedStatus = (orderStatus || "").toLowerCase().trim();
  const isOutForDelivery =
    normalizedStatus === "out_for_delivery" ||
    normalizedStatus === "out_for_delivery_active" ||
    normalizedStatus === "dispatched";
  const isDelivered =
    normalizedStatus === "delivered" || normalizedStatus === "completed";
  const isPreDelivery = !isOutForDelivery && !isDelivered;

  // Ref to hold current destination lat/lng to avoid re-initializing map on object re-renders
  const destCoordsRef = useRef<[number, number]>([
    destinationCoords.latitude,
    destinationCoords.longitude,
  ]);
  destCoordsRef.current = [destinationCoords.latitude, destinationCoords.longitude];

  // Calculate straight-line fallback distance using Haversine formula
  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Helper to fetch actual road route polyline from OSRM Routing API
  const fetchAndDrawOSRMRoute = async (
    riderLat: number,
    riderLng: number,
    destLat: number,
    destLng: number
  ) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${riderLng},${riderLat};${destLng},${destLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("OSRM API response not ok");

      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // Convert [lng, lat] from GeoJSON to [lat, lng] for Leaflet
        const roadCoords: [number, number][] = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );

        const distMeters = route.distance; // distance in meters
        const durationSec = route.duration; // duration in seconds

        const km = parseFloat((distMeters / 1000).toFixed(2));
        const mins = Math.max(1, Math.round(durationSec / 60));

        setDistanceKm(km);
        setEtaMinutes(mins);

        // Update map polyline with exact road path
        if (routePolylineRef.current && mapInstanceRef.current) {
          routePolylineRef.current.setLatLngs(roadCoords);
        }
        return;
      }
    } catch (err) {
      console.warn("OSRM routing API error, using fallback line:", err);
    }

    // Fallback if OSRM unavailable
    if (routePolylineRef.current && mapInstanceRef.current) {
      routePolylineRef.current.setLatLngs([
        [riderLat, riderLng],
        [destLat, destLng],
      ]);
    }
    const fallbackDist = calculateHaversineDistance(riderLat, riderLng, destLat, destLng);
    setDistanceKm(parseFloat(fallbackDist.toFixed(2)));
    setEtaMinutes(Math.max(1, Math.round(fallbackDist * 2.2)));
  };

  // Smooth lerp animation function for rider marker gliding
  const animateMarkerTo = (targetLat: number, targetLng: number, durationMs: number = 2500) => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    const startLat = currentRiderPosRef.current[0];
    const startLng = currentRiderPosRef.current[1];
    const startTime = performance.now();

    const frameStep = (now: number) => {
      if (!mapInstanceRef.current || !riderMarkerRef.current) {
        return;
      }

      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Smooth easeInOutQuad easing
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const interpolatedLat = startLat + (targetLat - startLat) * ease;
      const interpolatedLng = startLng + (targetLng - startLng) * ease;

      currentRiderPosRef.current = [interpolatedLat, interpolatedLng];

      // Update rider marker position on map safely
      try {
        const marker = riderMarkerRef.current as any;
        if (marker && marker._icon && mapInstanceRef.current) {
          marker.setLatLng([interpolatedLat, interpolatedLng]);
        }
      } catch (e) {
        console.warn("Marker setLatLng safety catch:", e);
      }

      if (progress < 1 && mapInstanceRef.current) {
        animFrameIdRef.current = requestAnimationFrame(frameStep);
      } else {
        setLastUpdatedTime(new Date().toLocaleTimeString());
      }
    };

    animFrameIdRef.current = requestAnimationFrame(frameStep);

    // Fetch road route for updated position
    fetchAndDrawOSRMRoute(targetLat, targetLng, destinationCoords.latitude, destinationCoords.longitude);
  };

  // 1. Initialize Leaflet Map (ONLY when out for delivery or delivered)
  useEffect(() => {
    if (isPreDelivery) return; // Do NOT initialize Leaflet map in pre-delivery state!
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Reset container if Leaflet left stale ID
    if (mapContainerRef.current && (mapContainerRef.current as any)._leaflet_id) {
      (mapContainerRef.current as any)._leaflet_id = null;
    }

    const destLat = destinationCoords.latitude;
    const destLng = destinationCoords.longitude;
    const startRiderLat = currentRiderPosRef.current[0];
    const startRiderLng = currentRiderPosRef.current[1];

    // Center map midpoint
    const midLat = (destLat + startRiderLat) / 2;
    const midLng = (destLng + startRiderLng) / 2;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([midLat, midLng], 14);

    // CartoDB Voyager Tiles (Google Maps / Foodpanda modern style)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    // Custom Rider Icon (Motorcycle inside a pulsing pink pin)
    const riderDivIcon = L.divIcon({
      className: "custom-rider-marker filter drop-shadow-xl",
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-12 h-12 bg-[#FF2B85]/40 rounded-full animate-ping"></div>
          <div class="w-10 h-10 bg-gradient-to-tr from-[#D70F64] to-[#FF2B85] text-white rounded-full flex items-center justify-center shadow-2xl border-2 border-white ring-4 ring-[#D70F64]/30 drop-shadow-lg">
            <span class="text-lg">🏍️</span>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    // Custom House / Destination Icon
    const houseDivIcon = L.divIcon({
      className: "custom-house-marker filter drop-shadow-xl",
      html: `
        <div class="relative flex items-center justify-center">
          <div class="w-10 h-10 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-2xl flex items-center justify-center shadow-xl border-2 border-white ring-4 ring-emerald-500/30 drop-shadow-lg">
            <span class="text-lg">🏠</span>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    // Add Destination Marker
    const destMarker = L.marker([destLat, destLng], { icon: houseDivIcon }).addTo(map);
    destMarker.bindTooltip("Delivery Destination (Your Address)", {
      permanent: false,
      direction: "top",
      className: "bg-zinc-900 text-white font-bold text-xs rounded-lg px-2 py-1 shadow-md border border-zinc-700",
    });

    // Add Rider Marker
    const riderMarker = L.marker([startRiderLat, startRiderLng], { icon: riderDivIcon }).addTo(map);
    riderMarker.bindTooltip(`${riderName} (Rider)`, {
      permanent: false,
      direction: "top",
      className: "bg-[#D70F64] text-white font-black text-xs rounded-lg px-2 py-1 shadow-md",
    });

    // Foodpanda Style Road Polyline (#D70F64, 6px weight, 0.85 opacity)
    const polyline = L.polyline(
      [
        [startRiderLat, startRiderLng],
        [destLat, destLng],
      ],
      {
        color: "#D70F64",
        weight: 6,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }
    ).addTo(map);

    // Fit bounds to show both markers comfortably
    const bounds = L.latLngBounds([
      [startRiderLat, startRiderLng],
      [destLat, destLng],
    ]);
    map.fitBounds(bounds, { padding: [55, 55] });

    mapInstanceRef.current = map;
    riderMarkerRef.current = riderMarker;
    destMarkerRef.current = destMarker;
    routePolylineRef.current = polyline;

    // Fetch initial OSRM route
    fetchAndDrawOSRMRoute(startRiderLat, startRiderLng, destLat, destLng);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      riderMarkerRef.current = null;
      destMarkerRef.current = null;
      routePolylineRef.current = null;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn("Leaflet map remove catch:", e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, [isPreDelivery]);

  // Update destination marker position if destinationCoords change without destroying map
  useEffect(() => {
    if (destMarkerRef.current) {
      destMarkerRef.current.setLatLng([
        destinationCoords.latitude,
        destinationCoords.longitude,
      ]);
    }
  }, [destinationCoords.latitude, destinationCoords.longitude]);

  // 2. Firebase Realtime Database Listener at path `/live_orders/{orderId}/rider_location`
  useEffect(() => {
    if (isPreDelivery || isDelivered || !isLiveTrackingEnabled) return; // Detach listener if pre-delivery, delivered or disabled by admin!

    let rtdb: any = null;
    let locationRef: any = null;

    try {
      rtdb = getDatabase(app);
      locationRef = ref(rtdb, `live_orders/${orderId}/rider_location`);

      setIsConnectedToRTDB(true);

      const unsubscribe = onValue(
        locationRef,
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const newLat = Number(data.lat ?? data.latitude);
            const newLng = Number(data.lng ?? data.longitude);

            if (!isNaN(newLat) && !isNaN(newLng)) {
              setIsRiderOnline(true);
              setHasReceivedRiderData(true);
              // Smooth gliding transition to new coordinates!
              animateMarkerTo(newLat, newLng, 2500);
              return;
            }
          }
          // If data is null or invalid
          setIsRiderOnline(false);
        },
        (error) => {
          console.warn("RTDB rider location listener warning:", error);
          setIsConnectedToRTDB(false);
          setIsRiderOnline(false);
        }
      );

      return () => {
        off(locationRef);
        if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      };
    } catch (err) {
      console.warn("Firebase Realtime Database handle exception:", err);
      setIsConnectedToRTDB(false);
      setIsRiderOnline(false);
    }
  }, [orderId, isPreDelivery, isDelivered, isLiveTrackingEnabled]);

  // Center Map View Helper Button
  const handleRecenterMap = () => {
    if (!mapInstanceRef.current) return;
    const bounds = L.latLngBounds([
      currentRiderPosRef.current,
      [destinationCoords.latitude, destinationCoords.longitude],
    ]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  // PRE-DELIVERY VIEW (Pending / Preparing / Ready)
  if (isPreDelivery) {
    const getPreDeliveryBadge = () => {
      switch (normalizedStatus) {
        case "placed":
        case "pending":
          return {
            label: "Order Placed 📝",
            sub: "Kitchen is reviewing your order",
            icon: <Receipt className="w-5 h-5 text-amber-400 animate-pulse" />,
            bg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
          };
        case "accepted":
        case "confirmed":
          return {
            label: "Order Accepted 👨‍🍳",
            sub: "Kitchen accepted & preparing ingredients",
            icon: <ChefHat className="w-5 h-5 text-sky-400 animate-bounce" />,
            bg: "bg-sky-500/10 border-sky-500/20 text-sky-400",
          };
        case "ready":
          return {
            label: "Food Ready for Dispatch 🛍️",
            sub: "Packed fresh! Assigning nearest rider...",
            icon: <ShoppingBag className="w-5 h-5 text-emerald-400 animate-bounce" />,
            bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
          };
        case "preparing":
        default:
          return {
            label: "Preparing your food 🍳",
            sub: "Chef is cooking your fresh hot meal",
            icon: <UtensilsCrossed className="w-5 h-5 text-[#D70F64] animate-bounce" />,
            bg: "bg-[#D70F64]/10 border-[#D70F64]/20 text-[#D70F64]",
          };
      }
    };

    const badge = getPreDeliveryBadge();
    const getStepIndex = () => {
      if (normalizedStatus === "placed" || normalizedStatus === "pending") return 0;
      if (normalizedStatus === "accepted" || normalizedStatus === "confirmed") return 1;
      if (normalizedStatus === "preparing") return 1;
      if (normalizedStatus === "ready") return 2;
      return 1;
    };
    const stepIdx = getStepIndex();

    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative text-zinc-100 animate-fade-in p-5 space-y-5">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#D70F64]/10 border border-[#D70F64]/30 flex items-center justify-center shrink-0 shadow-inner">
              {badge.icon}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#D70F64] block">
                {restaurantName || "Dadu Central Kitchen"}
              </span>
              <h3 className="text-sm font-black text-white mt-0.5">
                {badge.label}
              </h3>
              <p className="text-[11px] text-zinc-400 font-medium">
                {badge.sub}
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-3.5 py-2 text-right shrink-0">
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-zinc-500 block">
              Estimated Delivery
            </span>
            <span className="text-xs font-black text-pink-400 flex items-center gap-1.5 justify-end mt-0.5">
              <Clock className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
              Expected in 25–30 mins
            </span>
          </div>
        </div>

        {/* Foodpanda Animated 4-Step Progress Bar */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
            <span>Kitchen Live Order Pipeline</span>
            <span className="text-[#D70F64]">Foodpanda Dispatch</span>
          </div>

          <div className="relative pt-2 pb-1">
            {/* Progress Track Line */}
            <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1.5 bg-zinc-800 rounded-full z-0 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#D70F64] to-pink-500 transition-all duration-700 rounded-full shadow-lg"
                style={{
                  width: `${(stepIdx / 3) * 100}%`,
                }}
              />
            </div>

            {/* 4 Steps */}
            <div className="relative z-10 flex justify-between items-center">
              {[
                { label: "1. Placed", icon: "📝" },
                { label: "2. Preparing", icon: "🍳" },
                { label: "3. Out for Delivery", icon: "🛵" },
                { label: "4. Delivered", icon: "🎉" },
              ].map((step, idx) => {
                const isCompleted = idx < stepIdx;
                const isCurrent = idx === stepIdx;

                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                        isCurrent
                          ? "bg-[#D70F64] text-white ring-4 ring-[#D70F64]/30 scale-110 shadow-lg shadow-[#D70F64]/40"
                          : isCompleted
                          ? "bg-emerald-600 text-white shadow-md"
                          : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                      }`}
                    >
                      {isCompleted ? "✓" : step.icon}
                    </div>
                    <span
                      className={`text-[9.5px] font-black uppercase tracking-wider text-center max-w-[70px] ${
                        isCurrent
                          ? "text-[#D70F64]"
                          : isCompleted
                          ? "text-emerald-400"
                          : "text-zinc-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Restaurant Details & Order Summary List */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black text-white">
                {restaurantName || "Dadu Central Kitchen"}
              </span>
            </div>
            <span className="text-[10px] font-bold text-zinc-400">
              Order #{orderId.slice(-6).toUpperCase()}
            </span>
          </div>

          {/* Items list */}
          {items && items.length > 0 ? (
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {items.map((it, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded-md bg-[#D70F64]/10 text-[#D70F64] font-black text-[10px]">
                      {it.quantity}x
                    </span>
                    <span className="text-zinc-200 font-semibold truncate max-w-[180px] sm:max-w-[240px]">
                      {it.name}
                    </span>
                  </div>
                  <span className="text-zinc-300 font-extrabold">
                    Rs. {it.price * it.quantity}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-zinc-400 font-medium italic">
              Order items accepted by restaurant
            </div>
          )}

          {grandTotal !== undefined && (
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-black">
              <span className="text-zinc-400 uppercase tracking-wider text-[10px]">Total Amount</span>
              <span className="text-white text-sm">Rs. {grandTotal}</span>
            </div>
          )}
        </div>

        {/* Callout Notice Banner */}
        <div className="bg-pink-950/30 border border-[#D70F64]/20 rounded-2xl p-3 flex items-center gap-3 text-xs">
          <div className="w-8 h-8 rounded-xl bg-[#D70F64]/20 flex items-center justify-center shrink-0 text-[#D70F64]">
            <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <div className="text-[11px] text-pink-200/90 font-medium leading-snug">
            <strong className="text-white font-bold block">Live GPS Map Standby</strong>
            As soon as your order status changes to <span className="text-[#D70F64] font-bold">Out for Delivery</span>, live GPS map tracking will start automatically!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative text-zinc-100 animate-fade-in">
      {/* Header bar */}
      <div className="p-4 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#D70F64]/10 border border-[#D70F64]/30 flex items-center justify-center text-[#D70F64] shrink-0">
            <Bike className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#D70F64] block">
              Foodpanda Live GPS Map
            </span>
            <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
              <span>Rider: {riderName}</span>
              {isRiderOnline ? (
                <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Rider Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9px] bg-rose-500/10 text-rose-400 font-bold px-2 py-0.5 rounded-full border border-rose-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  Rider Offline
                </span>
              )}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRecenterMap}
            title="Recenter Map View"
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <Navigation className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Center Map</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-bold transition cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Map Box */}
      <div className="relative w-full h-72 sm:h-80 bg-zinc-900 overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Live Distance & ETA Floating Badge Overlay */}
        {!isDelivered && isLiveTrackingEnabled && (
          <div className="absolute top-3 left-3 z-20 bg-zinc-950/90 border border-zinc-800 backdrop-blur-md rounded-2xl p-2.5 shadow-xl text-xs space-y-1">
            <div className="flex items-center gap-2 text-zinc-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-[#FF2B85] animate-pulse"></span>
              <span>Road Distance: <strong className="text-white font-extrabold">{distanceKm ?? "--"} km</strong></span>
            </div>
            <div className="flex items-center gap-2 text-pink-400 font-black">
              <span>⏱️ Est. Arrival: <strong className="text-pink-300">{etaMinutes ?? "--"} mins</strong></span>
            </div>
          </div>
        )}

        {/* Rider Offline / Waiting for GPS Badge Overlay */}
        {!isDelivered && isLiveTrackingEnabled && (!isRiderOnline || !hasReceivedRiderData) && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 z-20 bg-rose-950/90 border border-rose-800/80 backdrop-blur-md text-rose-200 px-3.5 py-2 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-pulse">
            <div className="w-6 h-6 rounded-xl bg-rose-900/80 border border-rose-700/60 flex items-center justify-center shrink-0 text-rose-300">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="block text-white font-black text-[11px]">Rider Offline / Waiting for GPS signal</span>
              <span className="text-[10px] text-rose-300/80 font-normal">Tracking will resume automatically once rider connects</span>
            </div>
          </div>
        )}

        {/* Live Tracking Paused by Admin Overlay */}
        {!isDelivered && !isLiveTrackingEnabled && (
          <div className="absolute inset-0 z-30 bg-zinc-950/85 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center space-y-2.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-xl">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Live Tracking Paused by Admin</h4>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-xs leading-relaxed">
                Live GPS tracking is currently paused by admin to conserve bandwidth. Your order delivery is proceeding normally.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Card */}
      <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Destination: <strong className="text-zinc-200">Delivery Address</strong></span>
          </div>
        </div>

        <div className="text-zinc-500 text-[10px] font-mono">
          Last location update: {lastUpdatedTime}
        </div>
      </div>

      {/* SUCCESS MODAL / CELEBRATION OVERLAY FOR 'DELIVERED' STATUS */}
      {isDelivered && (
        <div className="absolute inset-0 z-30 bg-zinc-950/95 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center animate-fade-in space-y-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-1 shadow-2xl animate-bounce">
              <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
            </div>
            <div className="absolute -top-2 -right-2 text-2xl animate-pulse">🎉</div>
            <div className="absolute -bottom-2 -left-2 text-2xl animate-pulse">✨</div>
          </div>

          <div className="space-y-1.5 max-w-sm">
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 block">
              Order Delivered Successfully!
            </span>
            <h3 className="text-xl font-black text-white">Thank You for Ordering! ❤️</h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              Your food panda hero <strong className="text-zinc-200">{riderName}</strong> has safely delivered your order to your doorstep. Enjoy your delicious hot meal!
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 w-full max-w-xs">
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs py-3 px-4 rounded-xl shadow-lg transition active:scale-95 cursor-pointer"
            >
              Done / Close Tracker
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
