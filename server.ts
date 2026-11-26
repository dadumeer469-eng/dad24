import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Voice order agent — AI Studio (Gemini) Sindhi-speaking order taker.
  // POST { messages: [{role: "user"|"assistant", text}], menu: string }
  // Returns { say, done, order } — Gemini replies in JSON only.
  app.post("/api/voice-order", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }
    const { messages, menu } = req.body || {};
    if (!Array.isArray(messages) || typeof menu !== "string") {
      return res.status(400).json({ error: "messages and menu are required" });
    }

    const systemInstruction = `You are the Dadu Food voice order assistant, a friendly order-taking agent for Dadu Food — food and grocery delivery in Dadu city, Sindh, Pakistan.
Speak ONLY in Sindhi (Sindhi language, Perso-Arabic script). Be warm, polite and concise — short replies (1-2 sentences), because this is a voice conversation.
LANGUAGE (strict): You speak ONLY Sindhi. Never reply in Urdu, English, or any other language — even if the customer speaks to you in Urdu or English, always answer in Sindhi.
SCOPE (strict): You ONLY talk about Dadu Food — the food and grocery menu, prices, orders, delivery, payment (COD/Easypaisa), and opening hours. You do not answer questions about any other topic (no weather, news, general knowledge, other shops, or personal chat). If the customer asks about anything else, politely say in Sindhi that you can only help with Dadu Food orders, and ask what they would like to order.
Your job: take the customer's order step by step.
1. Ask what they want to order and how many of each.
2. Ask the delivery address (area/mohalla and house/street).
3. Ask the payment method: Cash on Delivery (COD) or Easypaisa.
4. Read back the FULL order (items, quantities, total price, address, payment) and ask them to confirm it is correct.
Delivery fee is Rs 50 (free above Rs 1000). Delivery time is 20-35 minutes. Food shops are open 12:00 PM to 11:00 PM.
MENU (name — price in Rs — type):
${menu}
Rules:
- Use the EXACT item names from the menu in the order. If the customer asks for something not on the menu, say it is not available and suggest the closest menu item.
- If the customer gives an item without a quantity, assume 1.
- Do NOT finish (done must stay false) until you have items with quantities, the address, the payment method, AND the customer confirmed the full order.
- Always respond in JSON ONLY, no other text:
{"say": "<your Sindhi reply to speak aloud>", "done": false, "order": null}
When everything is collected and confirmed, respond:
{"say": "<short Sindhi confirmation, e.g. thank you, your order is placed>", "done": true, "order": {"items": [{"name": "<exact menu name>", "qty": <number>, "type": "food" or "grocery"}], "address": {"area": "<area/mohalla>", "street": "<house/street>"}, "payment": "COD" or "Easypaisa"}}`;

    const contents = messages.map((m: { role: string; text: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.7,
            },
          }),
        },
      );
      if (!resp.ok) {
        const errText = await resp.text();
        console.error("Gemini voice-order error:", resp.status, errText.slice(0, 500));
        return res.status(502).json({ error: "Gemini request failed" });
      }
      const data = await resp.json();
      const raw =
        data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
      let parsed: { say: string; done: boolean; order: unknown } | null = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
      if (!parsed || typeof parsed.say !== "string") {
        // Fallback: treat the raw text as the spoken reply and keep listening.
        return res.json({ say: raw || "Maaf kajo, main samjhi na saghis. Mehrbani kare wari chao.", done: false, order: null });
      }
      return res.json({
        say: parsed.say,
        done: parsed.done === true,
        order: parsed.done === true ? parsed.order || null : null,
      });
    } catch (err) {
      console.error("Voice-order endpoint error:", err);
      return res.status(500).json({ error: "Voice order failed" });
    }
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Expose public browser Google Maps API key from runtime environment
  app.get("/api/maps-config", (_req, res) => {
    const apiKey =
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      "";
    res.json({ apiKey });
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
