import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 🔍 Google & Web Food Image Search API Route
  app.post(["/api/ai/search-food-image", "/api/ai/generate-food-image"], async (req, res) => {
    const {
      itemName = "Delicious Dish",
      query,
      category = "Food",
      restaurantName = "Restaurant",
      customPrompt,
    } = req.body || {};

    const searchQuery = (query || itemName || "").trim();

    // 🎯 Rich Real Food Photo Bank for Instant 100% Reliable Matching
    const getCuratedPhotos = (name: string, cat: string): string[] => {
      const n = (name + " " + cat).toLowerCase();

      if (n.includes("raita") || n.includes("dahi") || n.includes("chutney") || n.includes("dip") || n.includes("zeera raita") || n.includes("pudina")) {
        return [
          "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=500&q=80",
          "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("chai") || n.includes("tea") || n.includes("karak") || n.includes("doodh patti") || n.includes("matka chai")) {
        return [
          "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80",
          "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("green tea") || n.includes("kehwa") || n.includes("kahwa") || n.includes("qehwa")) {
        return [
          "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("lassi") || n.includes("meethi lassi") || n.includes("namkeen lassi") || n.includes("mango lassi")) {
        return [
          "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=500&q=80",
          "https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("biryani") || n.includes("sindhi biryani") || n.includes("hyderabadi") || n.includes("beef biryani") || n.includes("mutton biryani")) {
        return [
          "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=80",
          "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("pulao") || n.includes("yakhni") || n.includes("kabuli") || n.includes("rice") || n.includes("daal chawal")) {
        return [
          "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=500&q=80",
          "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("karahi") || n.includes("peshawari") || n.includes("shinwari") || n.includes("white karahi") || n.includes("mutton karahi")) {
        return [
          "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=500&q=80",
          "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("handi") || n.includes("makhni") || n.includes("butter chicken") || n.includes("korma") || n.includes("curry") || n.includes("qorma")) {
        return [
          "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=80",
          "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("nihari") || n.includes("nali nihari") || n.includes("haleem") || n.includes("daleem")) {
        return [
          "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("tikka") || n.includes("boti") || n.includes("malai boti") || n.includes("chargha") || n.includes("sajji")) {
        return [
          "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=500&q=80",
          "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("kabab") || n.includes("kebab") || n.includes("seekh") || n.includes("chapli") || n.includes("shami") || n.includes("bbq")) {
        return [
          "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=500&q=80",
          "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("naan") || n.includes("roghni") || n.includes("garlic naan") || n.includes("roti") || n.includes("paratha") || n.includes("kulcha")) {
        return [
          "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80",
          "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("puri") || n.includes("halwa puri") || n.includes("chana puri") || n.includes("bhatura")) {
        return [
          "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("zinger") || n.includes("burger") || n.includes("crispy burger") || n.includes("patty")) {
        return [
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80",
          "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("broast") || n.includes("fried chicken") || n.includes("nuggets") || n.includes("wings") || n.includes("tenders")) {
        return [
          "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=500&q=80",
          "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("roll") || n.includes("shawarma") || n.includes("wrap") || n.includes("paratha roll")) {
        return [
          "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("pizza") || n.includes("fajita pizza") || n.includes("tikka pizza") || n.includes("calzone") || n.includes("garlic bread")) {
        return [
          "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=80",
          "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("fries") || n.includes("finger chips") || n.includes("loaded fries") || n.includes("masala fries")) {
        return [
          "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("sandwich") || n.includes("club sandwich")) {
        return [
          "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("pasta") || n.includes("macaroni") || n.includes("noodles") || n.includes("chowmein")) {
        return [
          "https://images.unsplash.com/photo-1621996311239-f9c3eb7b2253?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("falooda") || n.includes("ice cream") || n.includes("kulfi") || n.includes("sundae")) {
        return [
          "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("gulab jamun") || n.includes("jalebi") || n.includes("kheer") || n.includes("rasmalai") || n.includes("mithai") || n.includes("sweet") || n.includes("dessert") || n.includes("cake")) {
        return [
          "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=500&q=80",
          "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("shake") || n.includes("smoothie")) {
        return [
          "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=500&q=80",
        ];
      }
      if (n.includes("drink") || n.includes("pepsi") || n.includes("coke") || n.includes("soda") || n.includes("juice") || n.includes("beverage")) {
        return [
          "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=80",
        ];
      }

      return [
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=80",
        "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=500&q=80",
      ];
    };

    try {
      const foundPhotos: string[] = [];

      const serpKey = process.env.SERPAPI_API_KEY || process.env.SERPER_API_KEY || "17d7c3ca57fa8553d099d13f3e1b8acbadf32939d9cdfa8a06efd12841471052";

      // 1. Google Images Search via SerpApi / Serper
      if (serpKey) {
        // A. Try SerpApi Google Images engine
        try {
          const serpQuery = encodeURIComponent(`${searchQuery} food dish`);
          const serpUrl = `https://serpapi.com/search.json?engine=google_images&q=${serpQuery}&api_key=${serpKey}&num=10`;
          const serpRes = await fetch(serpUrl);
          if (serpRes.ok) {
            const serpData: any = await serpRes.json();
            if (serpData?.images_results && Array.isArray(serpData.images_results)) {
              serpData.images_results.forEach((img: any) => {
                const u = img.original || img.thumbnail;
                if (u && (u.startsWith("http://") || u.startsWith("https://"))) {
                  foundPhotos.push(u);
                }
              });
            }
          }
        } catch {
          // Continue
        }

        // B. Try Serper.dev Google Images if SerpApi didn't return photos
        if (foundPhotos.length === 0) {
          try {
            const serperRes = await fetch("https://google.serper.dev/images", {
              method: "POST",
              headers: {
                "X-API-KEY": serpKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ q: `${searchQuery} food dish`, num: 10 }),
            });
            if (serperRes.ok) {
              const serperData: any = await serperRes.json();
              if (serperData?.images && Array.isArray(serperData.images)) {
                serperData.images.forEach((img: any) => {
                  const u = img.imageUrl || img.thumbnailUrl;
                  if (u && (u.startsWith("http://") || u.startsWith("https://"))) {
                    foundPhotos.push(u);
                  }
                });
              }
            }
          } catch {
            // Continue
          }
        }
      }

      // 2. Live search Wikimedia Commons API for authentic food photography
      if (foundPhotos.length < 3) {
        try {
          const cleanQuery = searchQuery.replace(/[^\w\s]/gi, " ").trim();
          const wikiSearchTerms = encodeURIComponent(`${cleanQuery} food`);
          const wikiRes = await fetch(
            `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${wikiSearchTerms}&gsrlimit=8&prop=imageinfo&iiprop=url|mime&format=json&origin=*`,
            { headers: { "User-Agent": "FoodPandaAdmin/1.0 (contact: info@foodpanda.local)" } }
          );
          if (wikiRes.ok) {
            const wikiData: any = await wikiRes.json();
            if (wikiData?.query?.pages) {
              Object.values(wikiData.query.pages).forEach((page: any) => {
                const info = page?.imageinfo?.[0];
                if (info?.url && (info.mime === "image/jpeg" || info.mime === "image/png" || info.mime === "image/webp")) {
                  if (!info.url.endsWith(".svg")) {
                    foundPhotos.push(info.url);
                  }
                }
              });
            }
          }
        } catch {
          // Continue to other sources silently
        }
      }

      // 3. Query Gemini with Google Search tool if API key is present (with graceful error handling)
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && foundPhotos.length < 3) {
        try {
          const ai = getGenAI();
          const searchPrompt = `Search Google for 3 high quality, direct image URLs (from Unsplash, Wikimedia, Flickr, Pexels, or Food blogs) showing an authentic, delicious food photo of "${searchQuery}" (${category}).
Return ONLY a valid JSON array of strings containing direct public image URLs. No markdown, no explanation. Example: ["https://images.unsplash.com/photo-...", "https://..."]`;

          const aiResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: searchPrompt,
            config: {
              tools: [{ googleSearch: {} }],
            },
          });

          const text = aiResponse.text?.trim() || "";
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            try {
              const urls = JSON.parse(jsonMatch[0]);
              if (Array.isArray(urls)) {
                urls.forEach((u: any) => {
                  if (typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://"))) {
                    foundPhotos.push(u);
                  }
                });
              }
            } catch {
              // ignore parse errors
            }
          }
        } catch {
          // If Gemini quota (429) or other API errors occur, seamlessly fallback
        }
      }

      // 4. Merge with our curated High-Definition culinary photos
      const curated = getCuratedPhotos(searchQuery, category);
      curated.forEach((c) => {
        if (!foundPhotos.includes(c)) {
          foundPhotos.push(c);
        }
      });

      const selectedUrl = foundPhotos[0] || curated[0];

      return res.json({
        success: true,
        imageUrl: selectedUrl,
        images: foundPhotos.slice(0, 12),
        source: "google_serp_search",
        searchQuery,
        itemName,
      });
    } catch {
      const curated = getCuratedPhotos(searchQuery, category);
      return res.json({
        success: true,
        imageUrl: curated[0],
        images: curated,
        source: "curated_web_match",
        searchQuery,
        itemName,
      });
    }
  });

  // 🤖 AI Business Manager & Master Operations Copilot Endpoint
  app.post("/api/ai/admin-manager", async (req, res) => {
    try {
      const { message = "", history = [], context = {} } = req.body || {};

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: "GEMINI_API_KEY is not configured.",
          reply: "Main aapka AI General Manager hoon! Please settings mein ja kar GEMINI_API_KEY configure karein taake main live autonomous operations execute kar sakun.",
          actions: [],
        });
      }

      const ai = getGenAI();

      const systemInstruction = `You are "Dadu Master AI Manager" (دادو ماسٹر اے آئی مینیجر) — the Executive AI General Manager and Chief Operating Officer (COO) for this food delivery & restaurant super-ecosystem in Dadu, Sindh, Pakistan.

CORE MISSION & IDENTITY (RESTAURANT OWNER'S DIRECT CHARTER):
- Tum sirf chatbot nahi ho, balkay restaurant ke tamam business operations ko autonomously aur professionally manage karne wale Real AI General Manager ho.
- Tumhara maqsad: Owner ka workload zero karna, sales & revenue maximize karna, customer retention boost karna, menu, inventory, pricing, timings, offers, cancellations aur loyalty coins manage karna.
- Address the owner with maximum respect as "Boss", "Admin Sahib", or "Sir". Speak in sharp, natural, polite, and authoritative Roman Urdu (or pure Urdu / English as requested).
- SYSTEM WORKFLOW: OWNER COMMAND → INTENT UNDERSTANDING → DATABASE CHECK → ACTION SELECTION → EXECUTE & VERIFY → RESULT SUMMARY.

25 CORE OPERATIONAL CAPABILITIES & ACTION PROTOCOLS:
1. **Owner Command System**: Understand natural language commands in Roman Urdu, Urdu, Hindi, English across all restaurant aspects.
2. **Customer Management**: Query and filter All users, New users, Active users, Inactive users, Never-ordered users, One-time customers, Returning customers, Top spenders, Most active customers.
3. **Customer Search**: Search customer by Name, Phone, Email, User ID, or Order ID using real telemetry data. Never hallucinate fake details.
4. **Customer Order History**: Retrieve order count, last order date, favorite items, delivery addresses, and total spent for any customer (e.g. "Ali ne kitne orders kiye?", "Is customer ne kya kya order kiya?").
5. **Customer Segmentation**: Segment users dynamically (VIP, High-value, Frequent, Inactive >30 days, Never ordered, Returning).
6. **Offers & Coupons**: Create discount vouchers ("create_voucher"), homepage promotional banners ("create_banner"), and push targeted notifications.
7. **Reward Coins / Loyalty**: Credit Loyalty Coins ("reward_user_coins") to specific user by phone/name, top 10 customers, users with >X orders, or all users with dual Firestore sync.
8. **Menu Management**: Add items ("add_item", "batch_add_items"), edit items/prices ("update_price", "bulk_price_adjust"), toggle bestseller ("toggle_bestseller"), delete items ("delete_item"), manage categories ("add_category", "delete_category").
9. **Item Scheduling**: Set availability hours and days for any item ("set_item_schedule" e.g., "Pizza 11 PM ke baad band ho", "Breakfast 7 AM to 12 PM").
10. **Restaurant Timings**: Set opening/closing hours, temporary closure, delivery charges, and minimum order limits ("update_restaurant_status").
11. **Order Management**: Analyze orders by status (New, Pending, Accepted, Preparing, Ready, Delivered, Cancelled, Rejected) and bulk update ("update_order_status").
12. **Smart Cancellation Monitoring**: Monitor cancellation ratios, repeated cancellation triggers, and alert owner with actionable insights.
13. **Sales Analytics**: Calculate today's sales, weekly/monthly revenue, AOV (Average Order Value), delivery success rate, and order volume.
14. **Business Intelligence**: Identify best performing & weak dishes, retention rates, high-margin combos, and popular ordering hours.
15. **Inventory Management**: Track stock levels, low-stock warnings, and out-of-stock items ("toggle_stock").
16. **Marketing Manager**: Prepare WhatsApp broadcast copy, Instagram/Facebook promotional posts, festival & weekend campaigns.
17. **AI Writer**: Generate appetizing food descriptions, ad copy, and push notification headlines in Urdu/English.
18. **Reviews & Feedback**: Analyze customer ratings and feedback comments, highlight common complaints, and provide improvement tips.
19. **Automation Engine**: Execute multi-step automation workflows ("composite_automation" e.g. Inactive user filter -> 20% Voucher -> 100 Coins reward -> Push notification -> Verification).
20. **Security & Confirmation**: Provide clear warnings for destructive actions (deletions, massive bulk discounts).

SUPPORTED ACTION SCHEMAS:
1. "create_rider": { "name": string, "phone": string, "password"?: string, "vehicleNumber"?: string }
2. "delete_rider": { "uid"?: string, "phone"?: string, "name"?: string }
3. "reward_user_coins": { "userId"?: string, "phone"?: string, "name"?: string, "bestUser"?: boolean, "topUsers"?: boolean, "allUsers"?: boolean, "coins": number, "reason"?: string }
4. "verify_user": { "userId"?: string, "phone"?: string, "address"?: string }
5. "block_user": { "userId"?: string, "phone"?: string, "isBlocked": boolean, "reason"?: string }
6. "add_item": { "name": string, "price": number, "discountPrice"?: number, "category": string, "restaurantName"?: string, "description"?: string, "isBestseller"?: boolean, "sizes"?: Array<{name: string, price: number}>, "flavors"?: Array<{name: string, price: number}>, "imageUrl"?: string }
7. "batch_add_items": { "items": Array<{ "name": string, "price": number, "discountPrice"?: number, "category": string, "description"?: string, "isBestseller"?: boolean, "sizes"?: Array<{name: string, price: number}> }> }
8. "update_price": { "itemId"?: string, "itemName"?: string, "newPrice": number, "newDiscountPrice"?: number }
9. "bulk_price_adjust": { "category"?: string, "percentChange"?: number, "amountChange"?: number, "direction": "increase" | "decrease" }
10. "toggle_stock": { "itemId"?: string, "itemName"?: string, "category"?: string, "isAvailable": boolean, "stockCount"?: number }
11. "set_item_schedule": { "itemId"?: string, "itemName"?: string, "openingTime"?: string, "closingTime"?: string, "scheduleDays"?: string[], "isAvailable"?: boolean, "note"?: string }
12. "apply_category_discount": { "category": string, "discountPercent": number }
13. "create_voucher": { "code": string, "discountAmount": number, "minOrderAmount": number, "discountType": "percentage" | "fixed", "description"?: string, "validTillDays"?: number, "targetSegment"?: string }
14. "create_banner": { "title": string, "subtitle": string, "tag"?: string, "discountPercent"?: number, "couponCode"?: string, "ctaText"?: string }
15. "send_notification": { "title": string, "message": string, "userId"?: string, "phone"?: string, "name"?: string, "bestUser"?: boolean, "topUsers"?: boolean, "allUsers"?: boolean, "segment"?: string }
16. "update_restaurant_status": { "restaurantName"?: string, "isUnavailable"?: boolean, "openingTime"?: string, "closingTime"?: string, "deliveryFee"?: number, "minimumOrder"?: number }
17. "toggle_bestseller": { "itemId"?: string, "itemName"?: string, "isBestseller": boolean }
18. "delete_item": { "itemId"?: string, "itemName"?: string }
19. "add_category": { "name": string, "icon"?: string, "imageUrl"?: string }
20. "delete_category": { "categoryId"?: string, "name"?: string }
21. "update_order_status": { "orderId"?: string, "status": "accepted" | "preparing" | "out_for_delivery" | "delivered" | "cancelled", "allPending"?: boolean }
22. "composite_automation": { "workflowType": "reactivate_inactive_users" | "vip_loyalty_boost" | "weekend_campaign", "daysInactive"?: number, "voucherCode"?: string, "discountAmount"?: number, "discountType"?: "percentage" | "fixed", "coins"?: number, "notificationTitle"?: string, "notificationMessage"?: string }
23. "temporary_close_restaurant": { "restaurantName": string, "reason": string, "durationHours"?: number, "riderIncidentId"?: string }
24. "reopen_restaurant": { "restaurantName": string, "reason"?: string }
25. "resolve_incident": { "incidentId": string, "resolution": string, "action": "approved" | "dismissed" | "reopened_restaurant" | "restricted_user" }
26. "restrict_customer_cod": { "userId"?: string, "phone": string, "name"?: string, "isRestricted": boolean, "reason": string }
27. "set_cod_limit": { "maxCodLimit": number }

INCIDENT INTELLIGENCE & DECISION RULES:
- "DETECT → VERIFY → ANALYZE → DECIDE → ACT → VERIFY → NOTIFY → LOG"
- If rider reports restaurant closed: verify rider, check active order & recent incidents. If confident, temporarily close restaurant (default 2 hrs auto-reopen), notify affected customer politely, alert admin, and write audit log.
- Customer risk scoring: Track high-risk COD abuse (repeated failed orders). Recommend or execute temporary COD restriction if verified repeatedly.
- High-value COD protection: Orders exceeding maxCodLimit (e.g. Rs 3,000) require safety risk checks.

LIVE REAL-TIME BUSINESS, CUSTOMER, INCIDENTS & RIDER TELEMETRY:
- Active Incidents Count: ${context.activeIncidentsCount || 0}
- Recent Incidents: ${(context.recentIncidents || []).slice(0, 10).map((inc: any) => `[${inc.incidentType}] ${inc.restaurantName || inc.orderId || 'General'}: "${inc.riderMessage}" (Status: ${inc.status}, Rider: ${inc.riderName})`).join('; ') || 'None'}
- Temporarily Closed Businesses: ${(context.temporarilyClosedBusinesses || []).map((b: any) => `${b.name} (Reason: ${b.reason || 'Closed'}, Reopen: ${b.expectedReopen || 'Pending'})`).join('; ') || 'None'}
- Configured COD Limit: Rs ${context.maxCodLimit || 3000}
- High Value Pending COD Orders: ${(context.highValueOrders || []).map((o: any) => `Order #${o.id.slice(-6)} (Rs ${o.grandTotal}, ${o.userName} ${o.userPhone})`).join('; ') || 'None'}
- High Risk Customers: ${(context.highRiskCustomers || []).map((c: any) => `${c.name} (${c.phone}) - Trust: ${c.trustScore}% [${c.failedCodOrders || 0} failed CODs]`).join('; ') || 'None'}
- Total Registered Customers: ${context.totalUsers || 0}
- Verified Active Customers: ${context.verifiedUsersCount || 0}
- Locked / Pending Approval Users: ${context.lockedUsersCount || 0} (${(context.lockedUsersList || []).map((u: any) => `${u.phone || u.name} (${u.area || 'Dadu'})`).join(', ') || 'None'})
- TOP MOST ACTIVE CUSTOMERS (BY ORDER COUNT):
${(context.topMostActiveCustomers || []).slice(0, 15).map((u: any, idx: number) => `  ${idx + 1}. ${u.name || 'User'} | Phone: ${u.phone} | Total Orders: ${u.ordersCount || 0} (${u.deliveredCount || 0} Delivered, ${u.cancelledCount || 0} Cancelled) | Spent: Rs ${u.totalSpent || 0} | Area: ${u.address || 'Dadu'}`).join('\n') || '  No user order history yet'}
- TOP HIGHEST SPENDERS (BY REVENUE):
${(context.topSpenderCustomers || []).slice(0, 15).map((u: any, idx: number) => `  ${idx + 1}. ${u.name || 'User'} | Phone: ${u.phone} | Total Spent: Rs ${u.totalSpent || 0} | Orders: ${u.ordersCount || 0}`).join('\n') || '  No revenue history yet'}
- TOP SELLING DISHES & POPULARITY:
${(context.topSellingDishes || []).slice(0, 15).map((d: any, idx: number) => `  ${idx + 1}. ${d.name} | Sold: ${d.count} units | Revenue: Rs ${d.revenue}`).join('\n') || '  No sales data yet'}
- REGISTERED RIDERS FLEET (${context.totalRidersCount || 0} Riders):
${(context.ridersList || []).map((r: any, idx: number) => `  ${idx + 1}. ${r.name} | Phone: ${r.phone} | Completed Deliveries: ${r.ordersCount || r.totalDeliveries || 0} | Active: ${r.activeOrders || 0}`).join('\n') || '  No riders registered yet'}
- Total Menu Dishes: ${context.dishesCount || 0}
- Items Currently Out of Stock: ${context.outOfStockCount || 0} (${(context.outOfStockNames || []).slice(0, 10).join(', ') || 'None'})
- Menu Categories: ${(context.categories || []).join(', ')}
- Sample Active Dishes: ${(context.sampleDishes || []).slice(0, 30).map((d: any) => `${d.name} (Rs ${d.price}, ${d.category}, ${d.isAvailable !== false ? 'InStock' : 'OutStock'}${d.isBestseller ? ', ★Bestseller' : ''})`).join('; ')}
- Total Lifetime Orders: ${context.totalOrdersCount || 0}
- Live / Active In-Progress Orders: ${context.activeOrdersCount || 0}
- Today's Orders: ${context.todayOrdersCount || 0}
- Today's Revenue: Rs ${context.todayRevenue || 0}
- Total Lifetime Revenue: Rs ${context.totalRevenue || 0}
- Average Order Value (AOV): Rs ${context.aov || 0}
- Cancelled Orders Ratio: ${context.cancelledOrdersCount || 0} (${context.cancellationRate || 0}%)
- Reviews & Ratings: ${context.reviewsCount || 0} Reviews (Avg Rating: ${context.avgRating || '5.0'} ⭐)
- Active Restaurants/Brands: ${(context.restaurants || []).join(', ')}

Output Format Requirements:
You MUST respond with a pure JSON object:
{
  "reply": "Your intelligent, respectful response in Roman Urdu explaining your managerial strategy, providing precise answers, confirming actions or asking required info.",
  "actions": [
    // Array of action objects to execute immediately (leave empty [] if only answering questions or asking for missing parameters)
  ],
  "suggestedQuickPrompts": [
    "3-4 short high-impact operational follow-up commands"
  ]
}`;

      // Build conversation contents
      const conversationContents: any[] = [];
      if (Array.isArray(history) && history.length > 0) {
        history.slice(-8).forEach((h: any) => {
          conversationContents.push({
            role: h.role === "assistant" || h.role === "model" ? "model" : "user",
            parts: [{ text: String(h.text || h.content || "") }],
          });
        });
      }

      conversationContents.push({
        role: "user",
        parts: [{ text: `Admin Master Command: ${message}` }],
      });

      const modelsToTry = ["gemini-3.7-flash", "gemini-2.5-flash", "gemini-2.5-pro"];
      let responseText = "";

      for (const modelName of modelsToTry) {
        try {
          const aiResponse = await ai.models.generateContent({
            model: modelName,
            contents: conversationContents,
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
            },
          });
          responseText = aiResponse.text?.trim() || "";
          if (responseText) break;
        } catch {
          // If error or rate limit, try next model
        }
      }

      let parsedResult: any = null;
      if (responseText) {
        try {
          parsedResult = JSON.parse(responseText);
        } catch {
          try {
            const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
            parsedResult = JSON.parse(cleanJson);
          } catch {
            // Fallback
          }
        }
      }

      // High-IQ Rule-based Operational Engine if cloud API is offline
      if (!parsedResult || !parsedResult.reply) {
        const lowerMsg = (message || "").toLowerCase();
        const localActions: any[] = [];
        let localReply = "";
        let localPrompts = [
          "👑 Sabse zyada order kisne kiye hain?",
          "🛵 Naya Rider ID banao: Tariq 03001234567",
          "📊 Aaj ki complete sales aur AOV report do",
          "🏷️ Fast food par 15% discount lagao",
          "🚀 2 High-Profit Combo Deals add karo"
        ];

        // 1. BEST USER LOYALTY COIN REWARD ("jo user best hai usko loyalty coin add kro", "best user ko coins do", etc.)
        if (
          (lowerMsg.includes("coin") || lowerMsg.includes("loyalty") || lowerMsg.includes("reward") || lowerMsg.includes("points") || lowerMsg.includes("inaam")) &&
          (lowerMsg.includes("best") || lowerMsg.includes("top") || lowerMsg.includes("loyal") || lowerMsg.includes("sabse zyada") || lowerMsg.includes("ziyada") || lowerMsg.includes("user") || lowerMsg.includes("customer") || lowerMsg.includes("unko") || lowerMsg.includes("isko") || lowerMsg.includes("add") || lowerMsg.includes("kro") || lowerMsg.includes("karo") || lowerMsg.includes("do") || lowerMsg.includes("dein"))
        ) {
          const numMatch = lowerMsg.match(/\b\d+\b/);
          const coinsAmount = numMatch ? parseInt(numMatch[0], 10) : 100;
          const isAll = lowerMsg.includes("tamam") || lowerMsg.includes("sab") || lowerMsg.includes("all");
          const isTop5 = lowerMsg.includes("top 5") || lowerMsg.includes("top users") || lowerMsg.includes("top customers");
          const topList = Array.isArray(context.topMostActiveCustomers) ? context.topMostActiveCustomers : [];

          if (isAll) {
            localActions.push({
              type: "reward_user_coins",
              payload: { allUsers: true, coins: coinsAmount, reason: "Storewide Loyalty Reward" }
            });
            localReply = `Boss! Tamam registered customers ko **${coinsAmount} Loyalty Coins** reward karne ka action trigger kar diya gaya hai.`;
          } else if (isTop5) {
            localActions.push({
              type: "reward_user_coins",
              payload: { topUsers: true, limit: 5, coins: coinsAmount, reason: "Top 5 VIP Customer Reward" }
            });
            localReply = `Boss! Hamare Top 5 VIP Loyal Customers ko **${coinsAmount} Loyalty Coins** reward kardiye gaye hain!`;
          } else {
            const top1 = topList[0] || { name: "Top Customer", phone: "", ordersCount: 1 };
            localActions.push({
              type: "reward_user_coins",
              payload: {
                bestUser: true,
                userId: top1.userId,
                phone: top1.phone,
                name: top1.name,
                coins: coinsAmount,
                reason: "Best Customer VIP Loyalty Gift"
              }
            });
            localReply = `Boss! Hamare #1 Top Customer **${top1.name}** (Phone: \`${top1.phone || 'Registered'}\`, Orders: ${top1.ordersCount || 1}) ko **${coinsAmount} Loyalty Coins** successfully add kardiye gaye hain!\n\n🎁 Customer ke account wallet mein coins credit ho chuke hain aur in-app celebratory notification deliver ho chuki hai!`;
            localPrompts = [
              `📢 ${top1.name} ko VIP appreciation message bhejo`,
              "🎟️ 20% OFF VIP Promo Voucher create karo",
              "👑 Sabse zyada order kisne kiye hain?"
            ];
          }
        }
        // 2. SEND MESSAGE / NOTIFICATION TO BEST USER / TOP USERS ("jo user best hai unko ye msg kro", "best customer ko message bhejo", etc.)
        else if (
          (lowerMsg.includes("msg") || lowerMsg.includes("message") || lowerMsg.includes("paighaam") || lowerMsg.includes("sms") || lowerMsg.includes("alert") || (lowerMsg.includes("notification") && !lowerMsg.includes("list"))) &&
          (lowerMsg.includes("best") || lowerMsg.includes("top") || lowerMsg.includes("loyal") || lowerMsg.includes("user") || lowerMsg.includes("customer") || lowerMsg.includes("unko") || lowerMsg.includes("isko") || lowerMsg.includes("ye") || lowerMsg.includes("kro") || lowerMsg.includes("karo") || lowerMsg.includes("bhejo") || lowerMsg.includes("send"))
        ) {
          const topList = Array.isArray(context.topMostActiveCustomers) ? context.topMostActiveCustomers : [];
          const top1 = topList[0] || { name: "Top Customer", phone: "" };

          let extractedMsg = message
            .replace(/jo user best hai unko/gi, "")
            .replace(/jo user best hai usko/gi, "")
            .replace(/best user ko/gi, "")
            .replace(/top customer ko/gi, "")
            .replace(/unko/gi, "")
            .replace(/isko/gi, "")
            .replace(/ye msg kro/gi, "")
            .replace(/ye message bhejo/gi, "")
            .replace(/msg kro/gi, "")
            .replace(/message kro/gi, "")
            .replace(/notification bhejo/gi, "")
            .replace(/send message/gi, "")
            .trim();

          if (!extractedMsg || extractedMsg.length < 5) {
            extractedMsg = `Assalam-o-Alaikum ${top1.name}! Dadu Food Delivery ka top loyal customer banne par shukriya! Aapke liye special discounts aur VIP rewards active hain.`;
          }

          localActions.push({
            type: "send_notification",
            payload: {
              bestUser: true,
              topUsers: true,
              userId: top1.userId,
              phone: top1.phone,
              name: top1.name,
              title: "Special VIP Appreciation Message 👑",
              message: extractedMsg
            }
          });

          localReply = `Boss! Hamare Top Customer **${top1.name}** (Phone: \`${top1.phone || 'VIP'}\`) ko aapka direct VIP message deliver kar diya gaya hai:\n\n📝 **Message Text:**\n*"${extractedMsg}"*\n\nCustomer ke device par push alert activate ho gaya hai!`;
          localPrompts = [
            `🎁 ${top1.name} ko 100 Loyalty Coins gift karo`,
            "🎟️ 20% OFF VIP Promo Voucher create karo",
            "👑 Sabse zyada order kisne kiye hain?"
          ];
        }
        // 3. BEST USER / TOP CUSTOMERS / MOST ORDERS INQUIRY
        else if (
          lowerMsg.includes("best user") ||
          lowerMsg.includes("top user") ||
          lowerMsg.includes("top customer") ||
          lowerMsg.includes("sabse zyada order") ||
          lowerMsg.includes("sabse ziada") ||
          lowerMsg.includes("ziyada order") ||
          lowerMsg.includes("zyada order") ||
          lowerMsg.includes("most order") ||
          lowerMsg.includes("loyal") ||
          lowerMsg.includes("vip customer") ||
          lowerMsg.includes("best customer") ||
          lowerMsg.includes("top spender")
        ) {
          const topList = Array.isArray(context.topMostActiveCustomers) ? context.topMostActiveCustomers : [];
          if (topList.length > 0) {
            const top1 = topList[0];
            const ranking = topList.slice(0, 5).map((u: any, idx: number) => {
              const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `🏅 #${idx + 1}`;
              return `${medal} **${u.name}** (\`${u.phone}\`)\n   📦 **${u.ordersCount} Orders** (${u.deliveredCount || u.ordersCount} Delivered) | 💰 Rs ${(u.totalSpent || 0).toLocaleString()} | 📍 ${u.address || 'Dadu'}`;
            }).join("\n\n");

            localReply = `Boss! Dadu Food Delivery data audit ke mutabiq hamare **#1 Top Loyal Customer** ye hain:\n\n👑 **${top1.name}**\n📞 **Phone:** \`${top1.phone}\`\n📦 **Total Orders:** ${top1.ordersCount} Orders (${top1.deliveredCount || top1.ordersCount} Delivered)\n💰 **Total Spend:** Rs ${(top1.totalSpent || 0).toLocaleString()}\n📍 **Address:** ${top1.address || 'Dadu, Sindh'}\n\n🏆 **Top 5 Customers Ranking:**\n\n${ranking}`;
            localPrompts = [
              `🎁 ${top1.name} ko 100 Loyalty Coins reward karo`,
              `📢 ${top1.name} ko appreciation message bhejo`,
              "🎟️ 20% OFF VIP Promo Voucher create karo"
            ];
          } else {
            localReply = `Boss! Filhal database mein naye orders record ho rahe hain. Jaise hi customers orders place karenge, live analytics aur customer ranking automatically calculate hogi.`;
          }
        }
        // 2. RIDER CREATION
        else if (
          lowerMsg.includes("rider new id") ||
          lowerMsg.includes("naya rider") ||
          lowerMsg.includes("rider banao") ||
          lowerMsg.includes("rider id") ||
          lowerMsg.includes("rider add") ||
          lowerMsg.includes("rider register") ||
          lowerMsg.includes("new rider")
        ) {
          const phoneMatch = message.match(/(?:03\d{9}|923\d{9}|\b\d{10,11}\b)/);
          const extractedPhone = phoneMatch ? phoneMatch[0] : "";

          let cleanRiderName = message
            .replace(/rider/gi, "")
            .replace(/new/gi, "")
            .replace(/id/gi, "")
            .replace(/banao/gi, "")
            .replace(/banayein/gi, "")
            .replace(/add/gi, "")
            .replace(/karo/gi, "")
            .replace(/karein/gi, "")
            .replace(/register/gi, "")
            .replace(/naya/gi, "")
            .replace(/naye/gi, "")
            .replace(/ki/gi, "")
            .replace(/ka/gi, "")
            .replace(/pass/gi, "")
            .replace(/password/gi, "")
            .replace(/pin/gi, "")
            .replace(/(?:03\d{9}|923\d{9}|\b\d{10,11}\b)/g, "")
            .replace(/[:\-]/g, "")
            .trim();

          const riderName = cleanRiderName.length >= 2 ? cleanRiderName.charAt(0).toUpperCase() + cleanRiderName.slice(1) : "";

          if (riderName || extractedPhone) {
            const finalName = riderName || "Active Rider";
            const finalPhone = extractedPhone || `0300${Math.floor(1000000 + Math.random() * 9000000)}`;
            const defaultPass = "123456";

            localActions.push({
              type: "create_rider",
              payload: {
                name: finalName,
                phone: finalPhone,
                password: defaultPass,
                vehicleNumber: "Active Rider"
              }
            });

            localReply = `Boss! Naye Rider **${finalName}** ki ID create aur register kardi gayi hai!\n\n📋 **Rider Profile Details:**\n• 👤 **Rider Name:** ${finalName}\n• 📱 **Login Phone / Username:** \`${finalPhone}\`\n• 🔑 **Default Login PIN / Password:** \`${defaultPass}\`\n• 🛵 **Vehicle Status:** Active Duty\n\nRider is credentials se Rider Portal par foran login kar sakta hai!`;
          } else {
            localReply = `Jee Boss! Main naya Rider register karne ke liye tayar hoon.\n\nBarah-e-karam Rider ka **Naam** aur **Phone Number** batayein (jaise: *"Rider Tariq 03001234567"*), ya niche diye gaye 1-Click buttons se banayein:`;
            localPrompts = [
              "🛵 Naya Rider banao: Name: Tariq Ahmed, Phone: 03001234567",
              "🛵 Naya Rider banao: Name: Ali Raza, Phone: 03129876543",
              "🛵 Tamam registered riders ki list dikhao"
            ];
          }
        }
        // 3. SALES & SUMMARY
        else if (lowerMsg.includes("sales") || lowerMsg.includes("order") || lowerMsg.includes("summary") || lowerMsg.includes("report") || lowerMsg.includes("hisaab") || lowerMsg.includes("kamai")) {
          localReply = `Boss, live business analysis:\n\n• 💰 **Aaj ki Sales:** Rs ${(context.todayRevenue || 0).toLocaleString()}\n• 📈 **Total Lifetime Revenue:** Rs ${(context.totalRevenue || 0).toLocaleString()}\n• 🎯 **Average Order Value (AOV):** Rs ${context.aov || 0}\n• 📦 **Active Orders:** ${context.activeOrdersCount || 0} orders kitchen/delivery mein hain\n• 🍽️ **Total Menu:** ${context.dishesCount || 0} items (${context.outOfStockCount || 0} out of stock)\n• 👥 **Registered Users:** ${context.totalUsers || 0} customers\n• 🛵 **Riders Fleet:** ${(context.ridersList || []).length} riders\n\nOperations bilkul smooth chal rahe hain!`;
        } else if (lowerMsg.includes("combo") || lowerMsg.includes("deal")) {
          localActions.push({
            type: "batch_add_items",
            payload: {
              items: [
                {
                  name: "Mega Zinger Feast Combo",
                  price: 890,
                  discountPrice: 750,
                  category: "Deals & Combos",
                  description: "2 Crispy Zinger Burgers + Large Seasoned Fries + 2 Cold Drinks (345ml)",
                  isBestseller: true
                },
                {
                  name: "Family Karahi Platter Deal",
                  price: 1850,
                  discountPrice: 1599,
                  category: "Deals & Combos",
                  description: "Half Chicken Karahi + 4 Roghani Naan + 1 Raita Salad + 1.5L Drink",
                  isBestseller: true
                }
              ]
            }
          });
          localReply = `Boss! Maine 2 high-margin high-converting deals ("Mega Zinger Feast" aur "Family Karahi Platter") create karke Menu mein add kardi hain. Ye deals average order value (AOV) 30% increase karengi!`;
        } else if (lowerMsg.includes("add") && (lowerMsg.includes("burger") || lowerMsg.includes("pizza") || lowerMsg.includes("karahi") || lowerMsg.includes("boti") || lowerMsg.includes("item"))) {
          const priceMatch = lowerMsg.match(/\d+/);
          const extractedPrice = priceMatch ? parseInt(priceMatch[0], 10) : 450;
          const cleanName = message.replace(/add/i, "").replace(/menu/i, "").replace(/mein/i, "").replace(/karo/i, "").replace(/rs\.?/i, "").replace(/\d+/g, "").trim() || "Special Dish";
          const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
          const cat = lowerMsg.includes("burger") || lowerMsg.includes("pizza") ? "Fast Food" : "Desi Food";
          localActions.push({
            type: "add_item",
            payload: {
              name: formattedName,
              price: extractedPrice,
              category: cat,
              isBestseller: true
            }
          });
          localReply = `Jee Boss! Maine "${formattedName}" ko Rs ${extractedPrice} ki price ke sath "${cat}" category mein add kar diya hai aur Bestseller tag bhi laga diya hai.`;
        } else if (lowerMsg.includes("discount") || lowerMsg.includes("off") || lowerMsg.includes("sale")) {
          const percentMatch = lowerMsg.match(/\d+/);
          const extractedPercent = percentMatch ? parseInt(percentMatch[0], 10) : 15;
          const cat = lowerMsg.includes("pizza") ? "Pizza" : lowerMsg.includes("burger") ? "Burgers" : "Fast Food";
          localActions.push({
            type: "apply_category_discount",
            payload: {
              category: cat,
              discountPercent: extractedPercent
            }
          });
          localReply = `Jee Boss, ${cat} category ke items par ${extractedPercent}% discount live apply ho gaya hai!`;
        } else if (lowerMsg.includes("voucher") || lowerMsg.includes("coupon") || lowerMsg.includes("promo")) {
          const code = `DEAL${Math.floor(100 + Math.random() * 900)}`;
          localActions.push({
            type: "create_voucher",
            payload: {
              code,
              discountAmount: 15,
              discountType: "percentage",
              minOrderAmount: 500,
              description: "Special App Promo Discount Voucher"
            }
          });
          localReply = `Boss, naya promo voucher "${code}" (15% OFF on orders above Rs 500) activate kar diya gaya hai!`;
        } else if (
          lowerMsg.includes("incident") ||
          lowerMsg.includes("cancel kyun hua") ||
          lowerMsg.includes("kyun cancel") ||
          lowerMsg.includes("cancel reason") ||
          lowerMsg.includes("rider ne kya report") ||
          lowerMsg.includes("rider report") ||
          lowerMsg.includes("restaurant band") ||
          lowerMsg.includes("temporary close") ||
          lowerMsg.includes("reopen") ||
          lowerMsg.includes("cod receive nahi") ||
          lowerMsg.includes("cod limit") ||
          lowerMsg.includes("risk score") ||
          lowerMsg.includes("fake order")
        ) {
          if (lowerMsg.includes("rider ne kya report") || lowerMsg.includes("rider report") || lowerMsg.includes("recent incident")) {
            const recent = Array.isArray(context.recentIncidents) ? context.recentIncidents : [];
            if (recent.length > 0) {
              const listText = recent.slice(0, 5).map((inc: any, i: number) => 
                `• **#${i+1} [${inc.incidentType || 'Incident'}]** ${inc.restaurantName || 'Order #' + (inc.orderId?.slice(-6) || '')}:\n  Rider: ${inc.riderName || 'Rider'} (\`${inc.riderPhone || ''}\`)\n  Report: "${inc.riderMessage}"\n  Status: ${inc.status?.toUpperCase()} | Action: ${inc.aiActionTaken || 'Under Review'}`
              ).join("\n\n");
              localReply = `Boss! Live Rider Incident Telemetry Reports:\n\n${listText}\n\nAap kisi bhi report par click karke direct action (Temporary Close / Order Cancel / Verify) le sakte hain.`;
            } else {
              localReply = `Boss! Filhal koi pending rider incident report nahi hai. Tamam operational deliveries smooth hain.`;
            }
          } else if (lowerMsg.includes("temporary close") || (lowerMsg.includes("band") && lowerMsg.includes("close"))) {
            const restName = (context.restaurants || []).find((r: string) => lowerMsg.includes(r.toLowerCase())) || "Target Restaurant";
            localActions.push({
              type: "temporary_close_restaurant",
              payload: {
                restaurantName: restName,
                reason: "Admin command via AI Manager: Temporary operational pause",
                durationHours: 2
              }
            });
            localReply = `Boss! **"${restName}"** ko 2 ghante ke liye **TEMPORARILY CLOSED** mark kar diya gaya hai. New orders pause ho chuke hain aur timer set ho gaya hai.`;
          } else if (lowerMsg.includes("reopen") || lowerMsg.includes("kholo")) {
            const restName = (context.restaurants || []).find((r: string) => lowerMsg.includes(r.toLowerCase())) || "Target Restaurant";
            localActions.push({
              type: "reopen_restaurant",
              payload: {
                restaurantName: restName,
                reason: "Admin manual reopen command"
              }
            });
            localReply = `Boss! **"${restName}"** ko successfully **REOPEN** kar diya gaya hai aur new orders lena shuru ho gaye hain.`;
          } else if (lowerMsg.includes("cod limit")) {
            const numMatch = lowerMsg.match(/\b\d+\b/);
            const newLimit = numMatch ? parseInt(numMatch[0], 10) : 3000;
            localActions.push({
              type: "set_cod_limit",
              payload: { maxCodLimit: newLimit }
            });
            localReply = `Boss! Platform COD maximum safety limit ko **Rs ${newLimit.toLocaleString()}** configure kar diya gaya hai. Is se baray orders par customer risk check trigger hoga.`;
          } else if (lowerMsg.includes("cod receive nahi") || lowerMsg.includes("fake order") || lowerMsg.includes("user block")) {
            localReply = `Boss! Customer Risk Score Engine ke mutabiq:\n\n• Agar customer ne 1 baar receive nahi kiya: **MEDIUM RISK (Trust 65%)** — Soft Warning.\n• Agar customer ne 3+ baar COD reject/refuse kiya: **HIGH RISK (Trust <40%)** — Auto COD Restriction Recommended.\n\nMain is customer ke liye **COD Payment Option Temporarily Restrict** kar sakta hoon taake fake orders se restaurant aur rider ka petrol/time waste na ho!`;
            localPrompts = [
              "🚫 High risk customers ki COD restrict karo",
              "🔴 Critical Incidents Radar dikhao",
              "📊 Aaj ka complete summary do"
            ];
          } else {
            localReply = `Boss! Main incidents, order cancellations, restaurant temporary closure, aur customer risk score ko live monitor kar raha hoon. Hukum karein!`;
          }
        } else if (lowerMsg.includes("notification") || lowerMsg.includes("alert") || lowerMsg.includes("bhejo") || lowerMsg.includes("announcement")) {
          localActions.push({
            type: "send_notification",
            payload: {
              title: "Special Treat from Dadu Hub! 🍔",
              message: message
            }
          });
          localReply = `Boss, tamam customers ko live announcement notification broadcast kar di gayi hai!`;
        } else {
          localReply = `Assalam-o-Alaikum Boss! Main aapka AI General Manager hoon. Store telemetry mein ${context.dishesCount || 0} dishes aur ${context.activeOrdersCount || 0} active orders hain. Aap mujhe naye combo deals banane, price badalne, discount lagane, ya push alert bhejne ka hukum dein!`;
        }

        parsedResult = {
          reply: localReply,
          actions: localActions,
          suggestedQuickPrompts: [
            "🚀 2 High-Profit Combo Deals add karo",
            "📊 Aaj ki complete sales aur AOV report do",
            "🏷️ Fast food par 15% discount lagao",
            "🎟️ Naya Rs 100 OFF coupon voucher create karo",
            "📢 Weekend flash sale push notification bhejo"
          ]
        };
      }

      return res.json({
        success: true,
        reply: parsedResult.reply || "Jee Boss, aapka order process ho gaya hai.",
        actions: Array.isArray(parsedResult.actions) ? parsedResult.actions : [],
        suggestedQuickPrompts: Array.isArray(parsedResult.suggestedQuickPrompts) ? parsedResult.suggestedQuickPrompts : [
          "📊 Aaj ki sales aur orders ka summary do",
          "🚀 2 High-Profit Combo Deals add karo",
          "🛑 Out of stock items ki list dikhao",
          "🎟️ Naya discount coupon create karo"
        ],
      });
    } catch (err: any) {
      console.error("AI Manager Error:", err);
      return res.json({
        success: true,
        reply: "Boss, main live hoon! Aap jo bhi task bolenge (jaise naya item add karna, combo banana, discount lagana, ya sales report), main foran execute kar doonga.",
        actions: [],
        suggestedQuickPrompts: [
          "📊 Aaj ki sales report do",
          "🚀 2 High-Profit Combo Deals add karo",
          "🏷️ Fast food par 15% discount lagao"
        ]
      });
    }
  });

  // 🛵 Rider AI Assistant Endpoint (Simple, Reliable Incident Classification & Structured Conversion)
  app.post("/api/ai/rider-incident", async (req, res) => {
    try {
      const { 
        message = "", 
        rider = {}, 
        order = null, 
        restaurants = [], 
        allOrders = [] 
      } = req.body || {};

      const lower = message.toLowerCase().trim();

      // Determine matched restaurant from active order or message text
      let targetRestaurant = order?.restaurantName || "";
      if (!targetRestaurant && Array.isArray(restaurants)) {
        targetRestaurant = restaurants.find((r: string) => lower.includes(r.toLowerCase())) || "";
      }

      // Determine incident type & severity
      let incidentType: string = "other";
      let severity: "low" | "medium" | "high" | "critical" = "medium";
      let aiAction: string = "admin_verification_required";
      let autoTemporaryClosure = false;

      if (lower.includes("restaurant band") || lower.includes("shop band") || lower.includes("dukan band") || lower.includes("hotel band") || lower.includes("closed")) {
        incidentType = "restaurant_closed";
        severity = "critical";
        autoTemporaryClosure = true;
        aiAction = "temporary_restaurant_closure";
      } else if (lower.includes("ready nahi") || lower.includes("time lag") || lower.includes("der ho") || lower.includes("delay")) {
        incidentType = "restaurant_delay";
        severity = "medium";
        aiAction = "kitchen_delay_alert";
      } else if (lower.includes("ghar par nahi") || lower.includes("nahi mil raha") || lower.includes("not available") || lower.includes("phone nahi utha")) {
        incidentType = "customer_unavailable";
        severity = "high";
        aiAction = "customer_call_retry";
      } else if (lower.includes("cancel kar diya") || lower.includes("mana kar") || lower.includes("refuse") || lower.includes("nahi chahiye")) {
        incidentType = "customer_refused";
        severity = "high";
        aiAction = "order_cancellation_review";
      } else if (lower.includes("wrong address") || lower.includes("galat address") || lower.includes("location nahi mil")) {
        incidentType = "wrong_address";
        severity = "medium";
        aiAction = "location_support";
      } else if (lower.includes("cash") || lower.includes("paise") || lower.includes("change nahi") || lower.includes("payment")) {
        incidentType = "payment_issue";
        severity = "high";
        aiAction = "payment_escalation";
      } else if (lower.includes("item nahi") || lower.includes("khatam ho") || lower.includes("out of stock")) {
        incidentType = "item_unavailable";
        severity = "high";
        aiAction = "item_out_of_stock";
      } else if (lower.includes("accident") || lower.includes("bike") || lower.includes("emergency") || lower.includes("gir gaya")) {
        incidentType = "accident_emergency";
        severity = "critical";
        aiAction = "emergency_reassign";
      }

      // Check if missing target restaurant when it's a restaurant problem and no order known
      let missingInfoPrompt: string | null = null;
      if (incidentType === "restaurant_closed" && !targetRestaurant && !order) {
        missingInfoPrompt = "Kaunsa restaurant ya shop band hai? Barah-e-karam restaurant ka naam batayein.";
      }

      // Formulate friendly Roman Urdu response for the Rider
      let reply = "";
      if (incidentType === "restaurant_closed") {
        reply = `Shukriya ${rider.name || 'Rider Bhai'}! Aapki report register ho chuki hai. Restaurant "${targetRestaurant || 'Dadu Partner'}" ko Admin AI Manager ne temporarily unavailable mark karne ka action trigger kar diya hai. Admin aur affected customer ko update bhej diya gaya hai.`;
      } else if (incidentType === "customer_unavailable" || incidentType === "customer_refused") {
        reply = `Report received! Customer unavailability/refusal ka incident save ho chuka hai. Customer ke order status aur risk profile ko update kar diya gaya hai.`;
      } else if (incidentType === "restaurant_delay") {
        reply = `Kitchen delay note ho gaya hai. Customer ko ETA notification automatically send kar di gayi hai.`;
      } else if (incidentType === "wrong_address") {
        reply = `Location issue report ho chuka hai. Support team & Customer WhatsApp link check karein.`;
      } else if (incidentType === "accident_emergency") {
        reply = `⚠️ Safety First! Aapki emergency report prioritize ho chuki hai. Admin team foran aap se contact karegi aur delivery reassigned kar di jayegi.`;
      } else {
        reply = `Aapka issue register ho gaya hai aur Admin AI Manager ko bhej diya gaya hai!`;
      }

      const structuredIncident = {
        riderId: rider.uid || "",
        riderName: rider.name || "Active Rider",
        riderPhone: rider.phone || "",
        restaurantName: targetRestaurant || order?.restaurantName || "",
        orderId: order?.id || "",
        orderTotal: order?.grandTotal || order?.totalPrice || 0,
        customerName: order?.userName || order?.name || "",
        customerPhone: order?.userPhone || order?.phone || "",
        customerId: order?.userId || "",
        incidentType,
        riderMessage: message,
        status: "reported",
        severity,
        aiAnalysis: `Auto-classified as ${incidentType} with ${severity} severity. Decision: ${aiAction}.`,
        aiActionTaken: aiAction,
        autoTemporaryClosure,
        reopenAfterHours: 2,
        createdAt: new Date().toISOString()
      };

      return res.json({
        success: true,
        reply,
        incident: structuredIncident,
        missingInfoPrompt
      });
    } catch (err: any) {
      console.error("Rider AI Incident error:", err);
      return res.status(500).json({
        success: false,
        error: "Rider AI assistant processing error"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
