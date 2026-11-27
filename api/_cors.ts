// Shared CORS helper for the voice API functions.
//
// The Capacitor APK bundles the web code and loads it from
// capacitor://localhost, where there is NO server — so its /api calls go
// cross-origin to https://www.dadufood.store. Without these headers the
// browser blocks them and Munchi cannot speak in the app. The website
// itself calls the same origin, so these headers are harmless there.
// (User 28 Nov 02:52: "munchi voice inbuilt daldo app me, api bhi chordo"
// — voice must work inside the APK, and the API stays live.)
export function withCors(req: any, res: any): boolean {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true; // preflight handled — caller should return
  }
  return false;
}
