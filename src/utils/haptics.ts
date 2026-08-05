/**
 * Safe haptic vibration utility for mobile devices.
 * Provides tactile feedback on user interactions like button clicks, category selection, and adding to cart.
 */
export function triggerHaptic(type: "light" | "medium" | "heavy" | "success" = "light") {
  if (typeof window !== "undefined" && "navigator" in window && typeof navigator.vibrate === "function") {
    try {
      switch (type) {
        case "light":
          navigator.vibrate(10);
          break;
        case "medium":
          navigator.vibrate(22);
          break;
        case "heavy":
          navigator.vibrate(40);
          break;
        case "success":
          navigator.vibrate([15, 30, 25]);
          break;
        default:
          navigator.vibrate(12);
      }
    } catch (e) {
      // Ignore browsers that enforce strict user gesture restrictions for vibration
    }
  }
}

export default triggerHaptic;
