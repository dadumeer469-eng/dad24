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
