import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { getDatabase, ref, onValue, off } from "firebase/database";
import { app, db } from "../firebase";
import daduLogo from "../assets/images/dadu_food_logo_new_1782333467889.jpg";
import {
  ChevronLeft,
  Compass,
  MessageSquare,
  Phone,
  ChevronRight,
  HelpCircle,
  X,
  MapPin,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import OrderChat from "./OrderChat";

interface Coords {
  latitude: number;
  longitude: number;
}

interface FoodDeliveryTrackerProps {
  orderId: string;
  orderStatus: string; // e.g. "out_for_delivery", "DELIVERED", "preparing", "accepted", "pending"
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  const normalizedStatus = (orderStatus || "").toLowerCase().trim();
  const isOutForDelivery =
    normalizedStatus === "out_for_delivery" ||
    normalizedStatus === "out_for_delivery_active" ||
    normalizedStatus === "dispatched";
  const isDelivered =
    normalizedStatus === "delivered" || normalizedStatus === "completed";
  const isKitchen =
    normalizedStatus === "preparing" ||
    normalizedStatus === "kitchen" ||
    normalizedStatus === "cooking" ||
    normalizedStatus === "in_kitchen";
  const isAccepted =
    normalizedStatus === "accepted" || normalizedStatus === "confirmed";
  const isPlaced =
    !isOutForDelivery && !isDelivered && !isKitchen && !isAccepted;

  // Restaurant location default to Dadu Central Kitchen or passed admin location
  const restLat = restaurantCoords?.latitude || 26.7323;
  const restLng = restaurantCoords?.longitude || 67.7744;

  // Position state refs for smooth animation
  // If rider is out for delivery, start from rider coords; otherwise start at store/restaurant location
  const initialPos: [number, number] = (isOutForDelivery || isDelivered)
    ? [
        initialRiderCoords?.latitude || restLat + 0.005,
        initialRiderCoords?.longitude || restLng + 0.005,
      ]
    : [restLat, restLng];

  const currentRiderPosRef = useRef<[number, number]>(initialPos);
  const animFrameIdRef = useRef<number | null>(null);

  const [distanceKm, setDistanceKm] = useState<number | null>(1.2);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(8);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("Just now");
  const [isRiderOnline, setIsRiderOnline] = useState<boolean>(true);
  const [isLiveTrackingEnabled, setIsLiveTrackingEnabled] = useState<boolean>(true);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  let statusTitle = "Order Received";
  let statusSubtitle = "Waiting for restaurant confirmation";
  let gaugePercent = "18";

  if (isDelivered) {
    statusTitle = "Order Delivered!";
    statusSubtitle = "Your Dadu Food hero delivered your meal";
    gaugePercent = "100";
  } else if (isOutForDelivery) {
    statusTitle = "On the way";
    statusSubtitle = "The rider is heading to you";
    gaugePercent = "80";
  } else if (isKitchen) {
    statusTitle = "Preparing in kitchen";
    statusSubtitle = "Chef is cooking your fresh hot meal";
    gaugePercent = "55";
  } else if (isAccepted) {
    statusTitle = "Order Confirmed";
    statusSubtitle = "Restaurant accepted your order";
    gaugePercent = "38";
  } else {
    statusTitle = "Order Received";
    statusSubtitle = "Waiting for restaurant to confirm";
    gaugePercent = "18";
  }

  // Calculate straight-line distance
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
        const roadCoords: [number, number][] = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );

        const distMeters = route.distance;
        const durationSec = route.duration;

        const km = parseFloat((distMeters / 1000).toFixed(1));
        const mins = Math.max(3, Math.round(durationSec / 60));

        setDistanceKm(km);
        setEtaMinutes(mins);

        if (routePolylineRef.current && mapInstanceRef.current) {
          routePolylineRef.current.setLatLngs(roadCoords);
        }
        return;
      }
    } catch (err) {
      console.warn("OSRM routing API error, using fallback line:", err);
    }

    if (routePolylineRef.current && mapInstanceRef.current) {
      routePolylineRef.current.setLatLngs([
        [riderLat, riderLng],
        [destLat, destLng],
      ]);
    }
    const fallbackDist = calculateHaversineDistance(riderLat, riderLng, destLat, destLng);
    setDistanceKm(parseFloat(fallbackDist.toFixed(1)));
    setEtaMinutes(Math.max(3, Math.round(fallbackDist * 3)));
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
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const interpolatedLat = startLat + (targetLat - startLat) * ease;
      const interpolatedLng = startLng + (targetLng - startLng) * ease;

      currentRiderPosRef.current = [interpolatedLat, interpolatedLng];

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
        setLastUpdatedTime("Just now");
      }
    };

    animFrameIdRef.current = requestAnimationFrame(frameStep);
    fetchAndDrawOSRMRoute(targetLat, targetLng, destinationCoords.latitude, destinationCoords.longitude);
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    if (mapContainerRef.current && (mapContainerRef.current as any)._leaflet_id) {
      (mapContainerRef.current as any)._leaflet_id = null;
    }

    const destLat = destinationCoords.latitude;
    const destLng = destinationCoords.longitude;
    const startRiderLat = currentRiderPosRef.current[0];
    const startRiderLng = currentRiderPosRef.current[1];

    const midLat = (destLat + startRiderLat) / 2;
    const midLng = (destLng + startRiderLng) / 2;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([midLat, midLng], 14);

    // CartoDB Voyager Tiles for Foodpanda style clean vector map
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    // Custom Dadu Food Rider Icon (Logo badge with rider ping)
    const riderDivIcon = L.divIcon({
      className: "custom-dadufood-rider-marker filter drop-shadow-md",
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-12 h-12 bg-[#D70F64]/25 rounded-full animate-ping"></div>
          <div class="w-10 h-10 bg-[#D70F64] text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white overflow-hidden p-0.5">
            <img src="${daduLogo}" class="w-full h-full object-cover rounded-full" />
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    // Custom Restaurant Pin Icon
    const restaurantDivIcon = L.divIcon({
      className: "custom-restaurant-marker filter drop-shadow-md",
      html: `
        <div class="relative flex items-center justify-center">
          <div class="w-10 h-10 bg-gradient-to-tr from-[#D70F64] to-amber-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white overflow-hidden p-0.5">
            <img src="${daduLogo}" class="w-full h-full object-cover rounded-full" />
          </div>
          <div class="absolute -bottom-1 bg-slate-900 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full border border-white shadow-xs">
            STORE
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    // Custom House Destination Icon
    const houseDivIcon = L.divIcon({
      className: "custom-house-marker filter drop-shadow-md",
      html: `
        <div class="relative flex items-center justify-center">
          <div class="w-9 h-9 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white">
            <svg class="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
              <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const destMarker = L.marker([destLat, destLng], { icon: houseDivIcon }).addTo(map);
    const riderMarker = L.marker([startRiderLat, startRiderLng], {
      icon: isOutForDelivery ? riderDivIcon : restaurantDivIcon,
    }).addTo(map);

    // Foodpanda Pink Road Polyline
    const polyline = L.polyline(
      [
        [startRiderLat, startRiderLng],
        [destLat, destLng],
      ],
      {
        color: "#D70F64",
        weight: 5,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
      }
    ).addTo(map);

    const bounds = L.latLngBounds([
      [startRiderLat, startRiderLng],
      [destLat, destLng],
    ]);
    map.fitBounds(bounds, { padding: [60, 60] });

    mapInstanceRef.current = map;
    riderMarkerRef.current = riderMarker;
    destMarkerRef.current = destMarker;
    routePolylineRef.current = polyline;

    fetchAndDrawOSRMRoute(startRiderLat, startRiderLng, destLat, destLng);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn("Leaflet cleanup:", e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // RTDB Listener
  useEffect(() => {
    if (isDelivered) return;

    let rtdb: any = null;
    let locationRef: any = null;

    try {
      rtdb = getDatabase(app);
      locationRef = ref(rtdb, `live_orders/${orderId}/rider_location`);

      const unsubscribe = onValue(
        locationRef,
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const newLat = Number(data.lat ?? data.latitude);
            const newLng = Number(data.lng ?? data.longitude);

            if (!isNaN(newLat) && !isNaN(newLng)) {
              setIsRiderOnline(true);
              animateMarkerTo(newLat, newLng, 2500);
              return;
            }
          }
        },
        (error) => console.warn("RTDB listener warning:", error)
      );

      return () => {
        off(locationRef);
      };
    } catch (err) {
      console.warn("Firebase Realtime DB exception:", err);
    }
  }, [orderId, isDelivered]);

  const handleRecenterMap = () => {
    if (!mapInstanceRef.current) return;
    const bounds = L.latLngBounds([
      currentRiderPosRef.current,
      [destinationCoords.latitude, destinationCoords.longitude],
    ]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  const currentEta = etaMinutes || 8;
  const minEta = Math.max(1, currentEta - 3);
  const maxEta = currentEta + 7;

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 font-sans relative flex flex-col overflow-hidden max-w-md mx-auto shadow-2xl rounded-3xl border border-slate-200">
      
      {/* 1. MAP VIEW CONTAINER (Full Screen / Half Screen Top) */}
      <div className="relative w-full h-[380px] sm:h-[420px] bg-slate-200 shrink-0 overflow-hidden">
        
        {/* Map Canvas */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Top Navigation Overlay Buttons */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          {onClose && (
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white hover:bg-slate-100 text-slate-900 rounded-full flex items-center justify-center shadow-lg border border-slate-200/80 pointer-events-auto transition active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
            </button>
          )}

          <button
            onClick={() => setShowHelpModal(true)}
            className="bg-white hover:bg-slate-100 text-slate-900 text-xs font-black px-4 py-2 rounded-xl shadow-lg border border-slate-200/80 pointer-events-auto transition active:scale-95 cursor-pointer"
          >
            Help
          </button>
        </div>

        {/* Floating Locate / Recenter Map Button */}
        <button
          onClick={handleRecenterMap}
          className="absolute bottom-6 right-4 z-20 w-10 h-10 bg-white hover:bg-slate-100 text-slate-800 rounded-full flex items-center justify-center shadow-lg border border-slate-200/80 transition active:scale-95 cursor-pointer"
          title="Recenter map"
        >
          <Compass className="w-5 h-5 text-slate-700" />
        </button>

        {/* 2. FLOATING OFFICIAL FOODPANDA ETA & STATUS CARD */}
        <div className="absolute bottom-3 left-4 right-16 z-20">
          <div className="bg-white/98 backdrop-blur-md shadow-2xl rounded-3xl p-4 sm:p-5 border border-slate-100 flex items-center justify-between transition-all">
            <div className="space-y-0.5">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                {orderEta ? (orderEta.toLowerCase().includes("min") ? orderEta : `${orderEta} mins`) : `${minEta} — ${maxEta} mins`}
              </h2>
              <p className="text-sm font-extrabold text-slate-900 pt-1">
                {statusTitle}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {statusSubtitle}
              </p>
            </div>

            {/* Circular Progress Ring Gauge */}
            <div className="relative w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Gray Background Circle */}
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Dark Green Arc Progress */}
                <path
                  className="text-[#0f6848] transition-all duration-1000 ease-out"
                  strokeDasharray={`${gaugePercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>

              {/* Dadu Food Shopping Bag Center Illustration */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center">
                  <div className="relative">
                    {/* Pink dadufood shopping bag */}
                    <div className="w-6 h-7 bg-[#D70F64] rounded-md shadow-xs flex items-center justify-center relative overflow-hidden p-0.5">
                      <div className="w-2.5 h-1.5 border-t-2 border-r-2 border-white/90 rounded-t-full -mt-4" />
                      <img src={daduLogo} alt="DF" className="w-4 h-4 object-cover rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. WHITE BOTTOM SHEET */}
      <div className="bg-white flex-1 rounded-t-3xl border-t border-slate-200/80 p-4 sm:p-5 shadow-inner space-y-4 -mt-2 z-10">
        
        {/* Drag Handle Indicator */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto -mt-1 mb-1" />

        {/* RIDER INFO CARD or KITCHEN PREPARATION CARD */}
        {isOutForDelivery || isDelivered ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {/* Pink Helmet Rider Avatar */}
                <div className="w-12 h-12 rounded-full bg-pink-100 border border-pink-200 flex items-center justify-center shrink-0 text-xl shadow-xs">
                  🪖
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                    {riderName || "Dadu Food Captain"}
                  </h4>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Motorbike • Dadu Food Captain
                  </p>
                </div>
              </div>

              {riderPhone && (
                <a
                  href={`tel:${riderPhone}`}
                  className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full flex items-center justify-center transition active:scale-95"
                  title="Call Rider"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Chat Action Button */}
            <button
              onClick={() => setShowChat(!showChat)}
              className="w-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-extrabold text-xs py-3 px-4 rounded-2xl flex items-center justify-between transition shadow-xs active:scale-98 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-700" />
                <span>Chat with your rider</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Expandable OrderChat Drawer */}
            {showChat && (
              <div className="pt-2 animate-fade-in">
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
          <div className="bg-gradient-to-br from-pink-50/80 via-white to-amber-50/40 border border-pink-200/80 rounded-2xl p-4 shadow-sm space-y-3 animate-fade-in">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#D70F64] text-white flex items-center justify-center shrink-0 font-extrabold text-xl shadow-xs">
                {isKitchen ? "🍳" : isAccepted ? "👨‍🍳" : "📝"}
              </div>

              <div>
                <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                  {restaurantName || "Dadu Central Kitchen"}
                </h4>
                <p className="text-xs font-semibold text-pink-600 mt-0.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping inline-block" />
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
                ? "The restaurant is cooking your order fresh and hot. A rider will pick up your meal as soon as it's ready. Rider details and direct live chat will open automatically once dispatched!"
                : isAccepted
                ? "The restaurant has confirmed your order and is getting ingredients ready for the kitchen!"
                : "Your order has been placed successfully and sent to the restaurant. They will confirm and start preparing your food shortly!"}
            </p>

            {/* Foodpanda style 4-step progress bar */}
            <div className="pt-2 border-t border-pink-100">
              <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-bold">
                {/* Step 1: Placed */}
                <div className={`flex flex-col items-center gap-1 ${isPlaced ? "text-[#D70F64] font-extrabold" : "text-emerald-600"}`}>
                  {isPlaced ? (
                    <div className="w-4.5 h-4.5 rounded-full bg-pink-100 border border-pink-500 flex items-center justify-center text-[9px] animate-bounce">
                      📝
                    </div>
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                  <span>Placed</span>
                </div>

                {/* Step 2: Accepted */}
                <div className={`flex flex-col items-center gap-1 ${isAccepted ? "text-[#D70F64] font-extrabold" : (isKitchen || isOutForDelivery || isDelivered) ? "text-emerald-600" : "text-slate-400"}`}>
                  {isAccepted ? (
                    <div className="w-4.5 h-4.5 rounded-full bg-pink-100 border border-pink-500 flex items-center justify-center text-[9px] animate-bounce">
                      👨‍🍳
                    </div>
                  ) : (isKitchen || isOutForDelivery || isDelivered) ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-300" />
                  )}
                  <span>Confirmed</span>
                </div>

                {/* Step 3: Kitchen */}
                <div className={`flex flex-col items-center gap-1 ${isKitchen ? "text-[#D70F64] font-extrabold" : (isOutForDelivery || isDelivered) ? "text-emerald-600" : "text-slate-400"}`}>
                  {isKitchen ? (
                    <div className="w-4.5 h-4.5 rounded-full bg-pink-100 border border-pink-500 flex items-center justify-center text-[9px] animate-bounce">
                      🍳
                    </div>
                  ) : (isOutForDelivery || isDelivered) ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-300" />
                  )}
                  <span>Kitchen</span>
                </div>

                {/* Step 4: On Way */}
                <div className={`flex flex-col items-center gap-1 ${isOutForDelivery ? "text-[#D70F64] font-extrabold" : isDelivered ? "text-emerald-600" : "text-slate-400"}`}>
                  {isOutForDelivery ? (
                    <div className="w-4.5 h-4.5 rounded-full bg-pink-100 border border-pink-500 flex items-center justify-center text-[9px] animate-bounce">
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

        {/* ORDER SUMMARY BANNER */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs border-b border-slate-200/80 pb-2">
            <span className="font-extrabold text-slate-800">
              {restaurantName || "Dadu Central Kitchen"}
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
                  <span className="font-bold text-slate-800">Rs. {it.price * it.quantity}</span>
                </div>
              ))}
            </div>
          )}

          {grandTotal !== undefined && (
            <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-xs font-black">
              <span className="text-slate-500">Total Paid (COD)</span>
              <span className="text-slate-900 text-sm">Rs. {grandTotal}</span>
            </div>
          )}
        </div>

        {/* SPONSORED BANNER CARD */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs h-24 bg-slate-100 flex items-center justify-between p-4">
          <img
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600"
            alt="Sponsored Offer"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/60 to-transparent" />
          
          <div className="relative z-10 space-y-0.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-pink-300 bg-black/40 px-2 py-0.5 rounded-full border border-pink-400/30">
              Sponsored
            </span>
            <h5 className="text-xs font-black text-white pt-1">
              Hot Deals & Free Delivery! 🍔
            </h5>
            <p className="text-[10px] text-slate-200 font-medium">
              Order again from Dadu Top Vendors
            </p>
          </div>
        </div>
      </div>

      {/* HELP MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-pink-100 border border-pink-200 overflow-hidden flex items-center justify-center shrink-0">
                <img src={daduLogo} alt="Dadu Food" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Dadu Food Support</h3>
                <p className="text-xs text-slate-500 font-medium">Order Help & Order Hotline</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href="https://wa.me/923277004471"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
              >
                <span>💬 WhatsApp Support (03277004471)</span>
              </a>

              <a
                href="tel:03277004471"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
              >
                <span>📞 Call Hotline</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
