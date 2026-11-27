import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import { getDatabase, ref, onValue, off } from "firebase/database";
import { app } from "../firebase";
import daduLogo from "../assets/images/dadu_food_logo_new_1782333467889.jpg";
import {
  ChevronLeft,
  Compass,
  MessageSquare,
  Phone,
  ChevronRight,
  X,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
} from "lucide-react";
import OrderChat from "./OrderChat";
import GoogleMapsProvider from "./GoogleMapsProvider";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface Coords {
  latitude: number;
  longitude: number;
}

interface FoodDeliveryTrackerProps {
  orderId: string;
  orderStatus: string;
  destinationCoords: Coords;
  restaurantCoords?: Coords;
  orderEta?: string;
  riderName?: string;
  riderPhone?: string;
  initialRiderCoords?: Coords;
  onClose?: () => void;
  restaurantName?: string;
  items?: { name: string; quantity: number; price: number }[];
  grandTotal?: number;
  currentUser?: any;
}

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
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
}

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function DeliveryRouteLayer({
  origin,
  destination,
  recenterSignal,
  onRouteMetrics,
}: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  recenterSignal: number;
  onRouteMetrics: (km: number, mins: number) => void;
}) {
  const map = useMap();
  const [routeCoords, setRouteCoords] = useState<Array<[number, number]> | null>(null);

  const fitBothMarkers = useCallback(() => {
    map.fitBounds(
      [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ],
      { padding: [48, 48] }
    );
  }, [map, origin.lat, origin.lng, destination.lat, destination.lng]);

  useEffect(() => {
    if (recenterSignal > 0) {
      // The map container resizes when the sheet collapses/expands —
      // Leaflet must re-measure or the newly exposed area stays grey.
      map.invalidateSize();
      fitBothMarkers();
    }
  }, [recenterSignal, fitBothMarkers]);

  useEffect(() => {
    let cancelled = false;

    const drawFallbackLine = () => {
      if (cancelled) return;
      setRouteCoords([
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ]);
      const fallbackDist = calculateHaversineDistance(
        origin.lat,
        origin.lng,
        destination.lat,
        destination.lng
      );
      onRouteMetrics(
        parseFloat(fallbackDist.toFixed(1)),
        Math.max(3, Math.round(fallbackDist * 3))
      );
      fitBothMarkers();
    };

    // Free OSRM routing (no key). Falls back to a straight line on any failure.
    const url =
      `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};` +
      `${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const route = data?.routes?.[0];
        const coords = route?.geometry?.coordinates;
        if (!route || !Array.isArray(coords) || coords.length === 0) {
          drawFallbackLine();
          return;
        }
        // OSRM returns [lng, lat] pairs; Leaflet wants [lat, lng].
        setRouteCoords(
          coords.map((c: number[]) => [c[1], c[0]] as [number, number])
        );
        const km = parseFloat(((route.distance || 0) / 1000).toFixed(1));
        const mins = Math.max(3, Math.round((route.duration || 0) / 60));
        onRouteMetrics(km, mins);
        fitBothMarkers();
      })
      .catch(() => {
        if (!cancelled) drawFallbackLine();
      });

    return () => {
      cancelled = true;
    };
  }, [map, origin.lat, origin.lng, destination.lat, destination.lng, fitBothMarkers, onRouteMetrics]);

  if (!routeCoords) return null;
  return (
    <Polyline
      positions={routeCoords}
      pathOptions={{ color: "#E21B70", weight: 5, opacity: 0.9 }}
    />
  );
}

function makeRiderIcon(isOutForDelivery: boolean) {
  if (isOutForDelivery) {
    return L.divIcon({
      html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:48px;height:48px"><div style="position:absolute;width:48px;height:48px;background:rgba(226,27,112,.25);border-radius:9999px;animation:ping 1s cubic-bezier(0,0,.2,1) infinite"></div><div style="position:relative;width:40px;height:40px;background:#E21B70;border-radius:9999px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1);border:2px solid #fff;overflow:hidden;padding:2px"><img src="${daduLogo}" alt="Rider" style="width:100%;height:100%;object-fit:cover;border-radius:9999px" /></div></div>`,
      className: "",
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });
  }
  return L.divIcon({
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center"><div style="width:40px;height:40px;background:#E21B70;border-radius:9999px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1);border:2px solid #fff;overflow:hidden;padding:2px"><img src="${daduLogo}" alt="Store" style="width:100%;height:100%;object-fit:cover;border-radius:9999px" /></div><div style="margin-top:-6px;background:#0f172a;color:#fff;font-size:8px;font-weight:900;padding:2px 6px;border-radius:9999px;border:1px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,.05)">STORE</div></div>`,
    className: "",
    iconSize: [40, 58],
    iconAnchor: [20, 20],
  });
}

function makeDestIcon() {
  return L.divIcon({
    html: `<div style="width:36px;height:36px;background:#0f172a;color:#fff;border-radius:9999px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1);border:2px solid #fff"><svg style="width:20px;height:20px;fill:#fff" viewBox="0 0 24 24"><path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z" /></svg></div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function TrackerMapCanvas({
  riderPos,
  destPos,
  isOutForDelivery,
  recenterSignal,
  onRouteMetrics,
}: {
  riderPos: { lat: number; lng: number };
  destPos: { lat: number; lng: number };
  isOutForDelivery: boolean;
  recenterSignal: number;
  onRouteMetrics: (km: number, mins: number) => void;
}) {
  const riderIcon = useMemo(
    () => makeRiderIcon(isOutForDelivery),
    [isOutForDelivery]
  );
  const destIcon = useMemo(() => makeDestIcon(), []);

  return (
    <MapContainer
      center={[(riderPos.lat + destPos.lat) / 2, (riderPos.lng + destPos.lng) / 2]}
      zoom={14}
      zoomControl={false}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      <DeliveryRouteLayer
        origin={riderPos}
        destination={destPos}
        recenterSignal={recenterSignal}
        onRouteMetrics={onRouteMetrics}
      />
      <Marker position={[riderPos.lat, riderPos.lng]} icon={riderIcon} />
      <Marker position={[destPos.lat, destPos.lng]} icon={destIcon} />
    </MapContainer>
  );
}

export default function FoodDeliveryTracker({
  orderId,
  orderStatus,
  destinationCoords,
  restaurantCoords,
  orderEta,
  riderName,
  riderPhone,
  initialRiderCoords,
  onClose,
  restaurantName,
  items,
  grandTotal,
  currentUser,
}: FoodDeliveryTrackerProps) {
  const normalizedStatus = (orderStatus || "").toLowerCase().trim();
  const isOutForDelivery =
    normalizedStatus === "out_for_delivery" ||
    normalizedStatus === "out_for_delivery_active" ||
    normalizedStatus === "dispatched";
  const isDelivered =
    normalizedStatus === "delivered" || normalizedStatus === "completed";
  const isCancelled = normalizedStatus === "cancelled";
  const isKitchen =
    normalizedStatus === "preparing" ||
    normalizedStatus === "kitchen" ||
    normalizedStatus === "cooking" ||
    normalizedStatus === "in_kitchen";
  const isAccepted =
    normalizedStatus === "accepted" || normalizedStatus === "confirmed";
  const isPlaced =
    !isOutForDelivery && !isDelivered && !isKitchen && !isAccepted && !isCancelled;

  const restLat = restaurantCoords?.latitude || 26.7323;
  const restLng = restaurantCoords?.longitude || 67.7744;

  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number }>(() =>
    isOutForDelivery || isDelivered
      ? {
          lat: initialRiderCoords?.latitude || restLat + 0.004,
          lng: initialRiderCoords?.longitude || restLng + 0.004,
        }
      : { lat: restLat, lng: restLng }
  );

  const destPos = {
    lat: destinationCoords?.latitude || 26.7323,
    lng: destinationCoords?.longitude || 67.7744,
  };

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [recenterSignal, setRecenterSignal] = useState<number>(0);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState<boolean>(false);

  // Focus trap + ESC to close the help modal (a11y fix 27 Nov 2026).
  const helpDialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(helpDialogRef, showHelpModal, () => setShowHelpModal(false));

  const handleRouteMetrics = useCallback((km: number, mins: number) => {
    setDistanceKm(km);
    setEtaMinutes(mins);
  }, []);

  const toggleSheet = () => {
    setIsSheetCollapsed((prev) => !prev);
    // Recenter after the 300ms sheet transition finishes, not mid-way.
    setTimeout(() => {
      setRecenterSignal((n) => n + 1);
    }, 320);
  };

  const isPaymentPending = normalizedStatus === "payment_verification_pending";
  let statusTitle = isPaymentPending ? "Payment verification pending" : "Order Received";
  let statusSubtitle = isPaymentPending
    ? "Admin is verifying your Easypaisa receipt (03277004471)"
    : "Waiting for restaurant confirmation";
  let gaugePercent = isPaymentPending ? "12" : "18";

  if (isCancelled) {
    statusTitle = "Order Cancelled";
    statusSubtitle = "This order was cancelled — no rider is on the way";
    gaugePercent = "0";
  } else if (isDelivered) {
    statusTitle = "Order Delivered!";
    statusSubtitle = "Your Dadu Food rider delivered your meal";
    gaugePercent = "100";
  } else if (isOutForDelivery) {
    statusTitle = "On the way";
    statusSubtitle =
      distanceKm !== null
        ? `Rider is ~${distanceKm} km away`
        : "The rider is heading to you";
    gaugePercent = "80";
  } else if (isKitchen) {
    statusTitle = "Preparing in kitchen";
    statusSubtitle = "Chef is cooking your fresh hot meal";
    gaugePercent = "55";
  } else if (isAccepted) {
    statusTitle = "Order Confirmed";
    statusSubtitle = "Restaurant accepted your order";
    gaugePercent = "38";
  }

  // Real-time rider coordinates from Firebase RTDB
  useEffect(() => {
    if (isDelivered || isCancelled) return;
    let locationRef: any = null;
    try {
      const rtdb = getDatabase(app);
      locationRef = ref(rtdb, `live_orders/${orderId}/rider_location`);
      onValue(
        locationRef,
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const newLat = Number(data.lat ?? data.latitude);
            const newLng = Number(data.lng ?? data.longitude);
            if (!isNaN(newLat) && !isNaN(newLng)) {
              setRiderPos({ lat: newLat, lng: newLng });
            }
          }
        },
        (error) => console.warn("RTDB listener warning:", error)
      );
      return () => {
        if (locationRef) off(locationRef);
      };
    } catch (err) {
      console.warn("Firebase Realtime DB exception:", err);
    }
  }, [orderId, isDelivered, isCancelled]);

  const currentEta = etaMinutes || 12;
  const minEta = Math.max(3, currentEta - 3);
  const maxEta = currentEta + 7;

  return (
    <div className="bg-slate-50 h-screen text-slate-900 font-sans relative flex flex-col overflow-hidden max-w-md mx-auto shadow-2xl rounded-3xl border border-slate-200">
      {/* 1. MAP VIEW CONTAINER */}
      <div
        className={`relative w-full transition-all duration-300 ease-in-out bg-slate-200 overflow-hidden ${
          isSheetCollapsed ? "flex-1 h-full" : "h-[320px] sm:h-[360px] shrink-0"
        }`}
      >
        <GoogleMapsProvider>
          <TrackerMapCanvas
            riderPos={riderPos}
            destPos={destPos}
            isOutForDelivery={isOutForDelivery}
            recenterSignal={recenterSignal}
            onRouteMetrics={handleRouteMetrics}
          />
        </GoogleMapsProvider>

        {/* Top Navigation Overlay Buttons */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close tracker"
              className="w-11 h-11 bg-white hover:bg-slate-100 text-slate-900 rounded-full flex items-center justify-center shadow-lg border border-slate-200/80 pointer-events-auto transition-transform duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
            </button>
          )}

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={toggleSheet}
              className="min-h-[44px] bg-white/95 backdrop-blur-md hover:bg-slate-100 text-slate-900 text-xs font-extrabold px-3 py-2 rounded-xl shadow-lg border border-slate-200/80 transition-transform duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer flex items-center gap-1.5"
            >
              {isSheetCollapsed ? (
                <Minimize2 className="w-3.5 h-3.5 text-[#E21B70]" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-[#E21B70]" />
              )}
              <span>{isSheetCollapsed ? "Show Details" : "Full Map"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="min-h-[44px] bg-white hover:bg-slate-100 text-slate-900 text-xs font-black px-3.5 py-2 rounded-xl shadow-lg border border-slate-200/80 transition-transform duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer"
            >
              Help
            </button>
          </div>
        </div>

        {/* Floating Recenter Map Button */}
        <button
          type="button"
          onClick={() => setRecenterSignal((n) => n + 1)}
          className={`absolute z-20 w-11 h-11 bg-white hover:bg-slate-100 text-slate-800 rounded-full flex items-center justify-center shadow-lg border border-slate-200/80 transition-transform duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer ${
            isSheetCollapsed ? "bottom-20 right-4" : "bottom-6 right-4"
          }`}
          title="Recenter map"
          aria-label="Recenter map"
        >
          <Compass className="w-5 h-5 text-slate-700" />
        </button>

        {/* FLOATING ETA & STATUS CARD */}
        {!isSheetCollapsed && (
          <div className="absolute bottom-2 left-3.5 right-16 z-20">
            <div className="bg-white/98 backdrop-blur-md shadow-xl rounded-2xl p-2.5 sm:p-3 border border-slate-100/90 flex items-center justify-between transition-all">
              <div className="space-y-0.5">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-none">
                  {isCancelled
                    ? "—"
                    : orderEta
                    ? orderEta.toLowerCase().includes("min")
                      ? orderEta
                      : `${orderEta} mins`
                    : `${minEta} – ${maxEta} mins`}
                </h2>
                <p className="text-xs font-bold text-slate-900 pt-0.5">{statusTitle}</p>
                <p className="text-[10.5px] text-slate-500 font-medium leading-none">
                  {statusSubtitle}
                </p>
              </div>

              {/* Circular Progress Ring Gauge */}
              <div className="relative w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center shrink-0 ml-2">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#E21B70] transition-[stroke-dasharray] duration-300 ease-out"
                    strokeDasharray={`${gaugePercent}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full bg-pink-50 flex items-center justify-center">
                    <div className="w-4 h-4.5 bg-[#E21B70] rounded-sm shadow-xs flex items-center justify-center relative overflow-hidden p-0.5">
                      <img src={daduLogo} alt="DF" className="w-3 h-3 object-cover rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. WHITE BOTTOM SHEET */}
      <div
        className={`bg-white rounded-t-3xl border-t border-slate-200/90 shadow-2xl transition-all duration-300 ease-in-out z-20 flex flex-col ${
          isSheetCollapsed
            ? "p-3 shrink-0"
            : "flex-1 overflow-y-auto p-4 sm:p-5 -mt-2 space-y-4"
        }`}
      >
        <button
          type="button"
          onClick={toggleSheet}
          className="w-full flex flex-col items-center justify-center py-1 cursor-pointer group focus:outline-none transition-transform duration-180 active:scale-[0.97] active:brightness-110"
          title={
            isSheetCollapsed
              ? "Tap to view full order details"
              : "Tap to collapse and view full map"
          }
        >
          <div className="w-12 h-1 bg-slate-300 group-hover:bg-[#E21B70] rounded-full mb-1 transition-colors" />
          <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-[#E21B70] text-[11px] font-extrabold uppercase tracking-wider">
            {isSheetCollapsed ? (
              <>
                <span>View Order Details</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Collapse for Full Map</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </div>
        </button>

        {isSheetCollapsed ? (
          <div
            onClick={toggleSheet}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-2xl p-3 flex items-center justify-between cursor-pointer transition shadow-xs mt-1"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-100 border border-pink-200 flex items-center justify-center text-lg shrink-0">
                {isOutForDelivery ? "🏍️" : "🍳"}
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 leading-tight">
                  {isCancelled
                    ? "—"
                    : orderEta
                    ? orderEta.toLowerCase().includes("min")
                      ? orderEta
                      : `${orderEta} mins`
                    : `${minEta} – ${maxEta} mins`}
                </h4>
                <p className="text-xs font-bold text-[#E21B70] mt-0.5">{statusTitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {riderPhone && !isCancelled && (
                <a
                  href={`tel:${riderPhone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="w-10 h-10 bg-white border border-slate-200 text-slate-800 rounded-full flex items-center justify-center shadow-xs transition-transform duration-180 active:scale-[0.97] active:brightness-110"
                  title="Call Rider"
                >
                  <Phone className="w-4 h-4 text-[#E21B70]" />
                </a>
              )}
              <div className="w-8 h-8 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-600">
                <ChevronUp className="w-4 h-4" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {isCancelled ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm space-y-2" role="status">
                <h4 className="text-sm font-extrabold text-red-700">Order Cancelled</h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  This order was cancelled, so no rider has been dispatched. If you need help, use the Help button above to reach Dadu Food support.
                </p>
              </div>
            ) : isOutForDelivery || isDelivered ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-pink-100 border border-pink-200 flex items-center justify-center shrink-0 text-xl shadow-xs">
                      🏍️
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                        {riderName || "Dadu Food Rider"}
                      </h4>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        Motorbike · Dadu Food Delivery
                      </p>
                    </div>
                  </div>

                  {riderPhone && (
                    <a
                      href={`tel:${riderPhone}`}
                      className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full flex items-center justify-center transition-transform duration-180 active:scale-[0.97] active:brightness-110"
                      title="Call Rider"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowChat(!showChat)}
                  className="w-full min-h-[44px] bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-extrabold text-xs py-3 px-4 rounded-2xl flex items-center justify-between transition-transform duration-180 active:scale-[0.97] active:brightness-110 shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-700" />
                    <span>Chat with your rider</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {showChat && (
                  <div className="pt-2">
                    <OrderChat
                      orderId={orderId}
                      currentUser={{
                        uid: currentUser?.uid || "guest",
                        name: currentUser?.name || "Customer",
                        role: currentUser?.role || "user",
                      }}
                      recipientName={riderName || "Rider"}
                      recipientRole="rider"
                      onClose={() => setShowChat(false)}
                      isOpen={showChat}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-pink-50/80 via-white to-rose-50/40 border border-pink-200/80 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#E21B70] text-white flex items-center justify-center shrink-0 font-extrabold text-xl shadow-xs">
                    {isKitchen ? "🍳" : isAccepted ? "👨‍🍳" : "📝"}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                      {restaurantName || "Dadu Kitchen"}
                    </h4>
                    <p className="text-xs font-semibold text-[#E21B70] mt-0.5 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#E21B70] animate-ping inline-block" />
                      {isKitchen
                        ? "Preparing in kitchen"
                        : isAccepted
                        ? "Order Confirmed"
                        : "Order Placed - Awaiting Confirmation"}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 font-medium leading-relaxed bg-white/90 p-3 rounded-xl border border-pink-100/80">
                  {isKitchen
                    ? "The restaurant is cooking your order fresh and hot. A rider will pick up your meal as soon as it is ready."
                    : isAccepted
                    ? "The restaurant has confirmed your order and is getting ingredients ready for the kitchen."
                    : "Your order has been placed and sent to the restaurant. They will confirm and start preparing your food shortly."}
                </p>

                <div className="pt-2 border-t border-pink-100">
                  <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-bold">
                    <div
                      className={`flex flex-col items-center gap-1 ${
                        isPlaced ? "text-[#E21B70] font-extrabold" : "text-emerald-600"
                      }`}
                    >
                      {isPlaced ? (
                        <div className="w-4.5 h-4.5 rounded-full bg-pink-100 border border-[#E21B70] flex items-center justify-center text-[9px]">
                          📝
                        </div>
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                      <span>Placed</span>
                    </div>

                    <div
                      className={`flex flex-col items-center gap-1 ${
                        isAccepted
                          ? "text-[#E21B70] font-extrabold"
                          : isKitchen || isOutForDelivery || isDelivered
                          ? "text-emerald-600"
                          : "text-slate-400"
                      }`}
                    >
                      {isAccepted ? (
                        <div className="w-4.5 h-4.5 rounded-full bg-pink-100 border border-[#E21B70] flex items-center justify-center text-[9px]">
                          👨‍🍳
                        </div>
                      ) : isKitchen || isOutForDelivery || isDelivered ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-300" />
                      )}
                      <span>Confirmed</span>
                    </div>

                    <div
                      className={`flex flex-col items-center gap-1 ${
                        isKitchen
                          ? "text-[#E21B70] font-extrabold"
                          : isOutForDelivery || isDelivered
                          ? "text-emerald-600"
                          : "text-slate-400"
                      }`}
                    >
                      {isKitchen ? (
                        <div className="w-4.5 h-4.5 rounded-full bg-pink-100 border border-[#E21B70] flex items-center justify-center text-[9px]">
                          🍳
                        </div>
                      ) : isOutForDelivery || isDelivered ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-300" />
                      )}
                      <span>Kitchen</span>
                    </div>

                    <div
                      className={`flex flex-col items-center gap-1 ${
                        isOutForDelivery
                          ? "text-[#E21B70] font-extrabold"
                          : isDelivered
                          ? "text-emerald-600"
                          : "text-slate-400"
                      }`}
                    >
                      {isOutForDelivery ? (
                        <div className="w-4.5 h-4.5 rounded-full bg-pink-100 border border-[#E21B70] flex items-center justify-center text-[9px]">
                          🏍️
                        </div>
                      ) : isDelivered ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-300" />
                      )}
                      <span>On Way</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ORDER SUMMARY */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs border-b border-slate-200/80 pb-2">
                <span className="font-extrabold text-slate-800">
                  {restaurantName || "Dadu Kitchen"}
                </span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">
                  #{orderId.slice(-6).toUpperCase()}
                </span>
              </div>

              {items && items.length > 0 && (
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 text-xs">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-slate-600 font-medium">
                      <span>
                        {it.quantity}x {it.name}
                      </span>
                      <span className="font-bold text-slate-800">
                        Rs. {it.price * it.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {grandTotal !== undefined && (
                <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-xs font-black">
                  <span className="text-slate-500">Grand Total</span>
                  <span className="text-slate-900 text-sm">Rs. {grandTotal}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* HELP MODAL */}
      {showHelpModal && (
        <div
          ref={helpDialogRef}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tracker-help-heading"
          tabIndex={-1}
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative animate-scale-up">
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-transform duration-180 active:scale-[0.97] active:brightness-110"
              aria-label="Close help modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-pink-100 border border-pink-200 overflow-hidden flex items-center justify-center shrink-0">
                <img src={daduLogo} alt="Dadu Food" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 id="tracker-help-heading" className="text-base font-extrabold text-slate-900">Dadu Food Support</h3>
                <p className="text-xs text-slate-500 font-medium">Order Help &amp; Order Hotline</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href="https://wa.me/923277004471"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-transform duration-180 active:scale-[0.97] active:brightness-110"
              >
                <span>WhatsApp Support (03277004471)</span>
              </a>

              <a
                href="tel:03277004471"
                className="w-full min-h-[44px] bg-[#E21B70] hover:bg-[#C2145E] text-white font-extrabold text-xs py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-transform duration-180 active:scale-[0.97] active:brightness-110 relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-all after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
              >
                <span>Call Helpline</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
