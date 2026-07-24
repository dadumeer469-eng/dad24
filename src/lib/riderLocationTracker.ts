import { useEffect, useRef, useState } from "react";
import { getDatabase, ref, set, onValue, off } from "firebase/database";
import { app } from "../firebase";

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

/**
 * Calculates distance in meters between two lat/lng coordinates using Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
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

/**
 * Smart Throttled Rider Location Tracker Class
 */
export class RiderLocationTracker {
  private orderId: string;
  private watchId: number | null = null;
  private lastSentLat: number | null = null;
  private lastSentLng: number | null = null;
  private lastSentTime: number = 0;
  private onLocationChange?: (coords: LocationCoords) => void;

  // Throttling thresholds
  private readonly TIME_THRESHOLD_MS = 20000; // 20 seconds
  private readonly DISTANCE_THRESHOLD_METERS = 25; // 25 meters

  constructor(orderId: string, onLocationChange?: (coords: LocationCoords) => void) {
    this.orderId = orderId;
    this.onLocationChange = onLocationChange;
  }

  /**
   * Starts tracking rider movement via navigator.geolocation.watchPosition
   */
  public startTracking(): void {
    if (this.watchId !== null) return; // Already watching

    if (!navigator.geolocation) {
      console.warn("Geolocation API is not supported in this browser.");
      return;
    }

    console.log(`[RiderLocationTracker] Starting location watch for order #${this.orderId}`);

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.processLocationUpdate(latitude, longitude);
      },
      (error) => {
        console.warn("[RiderLocationTracker] watchPosition error:", error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000,
      }
    );
  }

  /**
   * Evaluates Smart Throttling conditions and updates Firebase Realtime Database
   */
  private processLocationUpdate(latitude: number, longitude: number): void {
    const now = Date.now();
    const timeElapsedMs = now - this.lastSentTime;

    let distanceMovedMeters = 0;
    if (this.lastSentLat !== null && this.lastSentLng !== null) {
      distanceMovedMeters = calculateDistanceMeters(
        this.lastSentLat,
        this.lastSentLng,
        latitude,
        longitude
      );
    }

    const isFirstWrite = this.lastSentTime === 0;
    const timeConditionMet = timeElapsedMs >= this.TIME_THRESHOLD_MS;
    const distanceConditionMet = distanceMovedMeters >= this.DISTANCE_THRESHOLD_METERS;

    // Smart Throttling Filter: Write ONLY if 20s elapsed OR moved > 25 meters
    if (isFirstWrite || timeConditionMet || distanceConditionMet) {
      console.log(
        `[RiderLocationTracker] Pushing position update for order #${this.orderId} (Time elapsed: ${Math.round(
          timeElapsedMs / 1000
        )}s, Distance moved: ${Math.round(distanceMovedMeters)}m)`
      );

      this.pushLocationToFirebase(latitude, longitude, now);

      this.lastSentLat = latitude;
      this.lastSentLng = longitude;
      this.lastSentTime = now;

      if (this.onLocationChange) {
        this.onLocationChange({ latitude, longitude });
      }
    }
  }

  /**
   * Pushes coordinates to Firebase Realtime Database at `/live_orders/{orderId}/rider_location`
   */
  private pushLocationToFirebase(latitude: number, longitude: number, timestamp: number): void {
    try {
      const rtdb = getDatabase(app);
      const locationRef = ref(rtdb, `live_orders/${this.orderId}/rider_location`);
      set(locationRef, {
        latitude,
        longitude,
        lat: latitude,
        lng: longitude,
        timestamp,
      });
    } catch (err) {
      console.error("[RiderLocationTracker] Failed to push location to Firebase RTDB:", err);
    }
  }

  /**
   * Stops geolocation watch and clears resources to save battery and data
   */
  public stopTracking(): void {
    if (this.watchId !== null && navigator.geolocation) {
      console.log(`[RiderLocationTracker] Stopping location watch for order #${this.orderId}`);
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}

/**
 * Custom React Hook for automatically managing Rider Location Tracking based on order status
 */
export function useRiderLocationTracker(
  orderId: string | null | undefined,
  orderStatus: string | null | undefined
) {
  const [currentCoords, setCurrentCoords] = useState<LocationCoords | null>(null);
  const [isLiveTrackingEnabled, setIsLiveTrackingEnabled] = useState<boolean>(true);
  const trackerRef = useRef<RiderLocationTracker | null>(null);

  // Listen to admin toggle setting at /settings/live_tracking_enabled
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
      console.warn("RTDB settings listener warning:", e);
    }
  }, []);

  useEffect(() => {
    // Normalize status string
    const normalizedStatus = orderStatus?.toLowerCase().trim();

    // Condition: Only run location watcher if status is active ('out_for_delivery') AND live tracking enabled by admin
    const isActive = normalizedStatus === "out_for_delivery";

    if (!orderId || !isActive || !isLiveTrackingEnabled) {
      if (trackerRef.current) {
        console.log("[RiderLocationTracker] Tracking disabled by admin or inactive order. Stopping watch.");
        trackerRef.current.stopTracking();
        trackerRef.current = null;
      }
      return;
    }

    // Initialize & start tracker
    const tracker = new RiderLocationTracker(orderId, (coords) => {
      setCurrentCoords(coords);
    });

    trackerRef.current = tracker;
    tracker.startTracking();

    // Cleanup function when component unmounts or orderId/status/setting changes
    return () => {
      if (trackerRef.current) {
        trackerRef.current.stopTracking();
        trackerRef.current = null;
      }
    };
  }, [orderId, orderStatus, isLiveTrackingEnabled]);

  return currentCoords;
}
