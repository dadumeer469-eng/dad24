// Build-time prerendering plugin for Dadu Food.
//
// Problem: the app is a client-rendered SPA, so every route serves the same
// raw dist/index.html. Google therefore sees one static canonical (the
// homepage) for every route and treats the shop pages as alternates of the
// homepage ("Page with redirect" in Search Console — not indexed).
//
// Fix: after `vite build` writes dist/index.html, this plugin derives one
// per-route HTML file from it by STRING REPLACEMENT of head tags + the
// noscript block, and injects a per-route JSON-LD block. Vercel serves a
// real static file from dist/ BEFORE applying vercel.json rewrites, so e.g.
// dist/shop/dadu-fast-food-kitchen/index.html is served for
// /shop/dadu-fast-food-kitchen instead of the SPA rewrite.
//
// Template-based prerendering only — the React app is NEVER executed here
// (no Puppeteer/jsdom/Firestore). The <div id="root">, the hashed
// /assets/*.js module script and the inline PWA/service-worker script are
// carried over untouched from the built dist/index.html, so the SPA keeps
// working exactly as before.
//
// Fail-soft by design: every step is wrapped in try/catch and only logs a
// warning. If prerendering fails for any reason, the build still succeeds
// with the plain SPA index.html.
//
// Route data lives in ./prerender-routes.mjs (single source, kept in sync
// with src/utils/seoManager.ts). Only Node built-ins (fs/path) are used —
// no new npm dependency, nothing to install at build time on Vercel.

import fs from "node:fs";
import path from "node:path";
import { ROUTES, OG_IMAGE, ORIGIN, KEYWORDS, buildJsonLd } from "./prerender-routes.mjs";

const PLUGIN_NAME = "dadufood-prerender";

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Replace the content="..." of one <meta> tag identified by attr="key"
// (e.g. name="description", property="og:title"). Matches regardless of
// attribute order inside the tag.
function setMetaContent(html, attr, key, value) {
  const tagRe = new RegExp(`<meta\\s[^>]*?${attr}="${key}"[^>]*?>`, "i");
  const match = html.match(tagRe);
  if (!match) {
    console.warn(`[${PLUGIN_NAME}] meta ${attr}="${key}" not found in built index.html — leaving as-is`);
    return html;
  }
  const newTag = /content="/i.test(match[0])
    ? match[0].replace(/content="[^"]*"/i, `content="${escapeAttr(value)}"`)
    : match[0].replace(/\/?>$/, ` content="${escapeAttr(value)}"$&`);
  return html.replace(match[0], () => newTag);
}

// Replace the href="..." of the <link rel="canonical"> tag.
function setCanonical(html, url) {
  const tagRe = /<link\s[^>]*?rel="canonical"[^>]*?>/i;
  const match = html.match(tagRe);
  if (!match) {
    console.warn(`[${PLUGIN_NAME}] <link rel="canonical"> not found in built index.html — leaving as-is`);
    return html;
  }
  const newTag = match[0].replace(/href="[^"]*"/i, `href="${escapeAttr(url)}"`);
  return html.replace(match[0], () => newTag);
}

// Inject (or, if present, replace) the single JSON-LD block.
// id="dadu-dynamic-jsonld" is the id seoManager.setJsonLd() looks up at
// runtime — it UPDATES this script's textContent in place, never creates a
// duplicate, so the static and runtime JSON-LD can never double up.
function setJsonLd(html, route) {
  const json = JSON.stringify(buildJsonLd(route));
  const script = `<script id="dadu-dynamic-jsonld" type="application/ld+json">${json}</script>`;
  const existingRe = /<script[^>]*id="dadu-dynamic-jsonld"[^>]*>[\s\S]*?<\/script>/i;
  if (existingRe.test(html)) {
    return html.replace(existingRe, () => script);
  }
  if (!html.includes("</head>")) {
    console.warn(`[${PLUGIN_NAME}] no </head> found — skipping JSON-LD for ${route.path}`);
    return html;
  }
  return html.replace("</head>", () => `${script}\n  </head>`);
}

// Build a route-specific <noscript> block reusing the exact dark-card
// styling of the homepage noscript in index.html.
function buildNoscript(route) {
  const { h1, sections } = route.noscript;
  const sectionsHtml = sections
    .map(
      (s) =>
        `\n          <h2 style="font-size: 16px; font-weight: 800; color: #E21B70; margin: 0 0 8px 0;">${escapeHtmlText(s.h2)}</h2>\n          <p style="font-size: 14px; color: #e4e4e7; line-height: 1.6; margin: 0 0 16px 0;">${escapeHtmlText(s.p)}</p>`
    )
    .join("");
  // Real internal links in every prerendered page, so a no-JS crawler can
  // discover all 15 routes from any page (the React app navigates via
  // onClick + replaceState, which crawlers do not follow).
  const linksHtml = `\n          <p style="font-size: 14px; color: #e4e4e7; line-height: 1.6; margin: 0 0 16px 0;">Browse Dadu Food: <a href="${ORIGIN}/restaurants" style="color: #FF4D94;">Restaurants in Dadu</a> &middot; <a href="${ORIGIN}/shop/dadu-fast-food-kitchen" style="color: #FF4D94;">Dadu Fast Food &amp; Kitchen</a> &middot; <a href="${ORIGIN}/shop/s-m-bilal-hotel" style="color: #FF4D94;">S M Bilal Hotel</a> &middot; <a href="${ORIGIN}/shop/tasty-bites-dadu" style="color: #FF4D94;">Tasty Bites Dadu</a> &middot; <a href="${ORIGIN}/grocery" style="color: #FF4D94;">Grocery Delivery in Dadu</a> &middot; <a href="${ORIGIN}/pharmacy" style="color: #FF4D94;">Medicine Delivery in Dadu</a> &middot; <a href="${ORIGIN}/hotels" style="color: #FF4D94;">Hotels in Dadu</a> &middot; <a href="${ORIGIN}/about" style="color: #FF4D94;">About Dadu Food</a> &middot; <a href="${ORIGIN}/contact" style="color: #FF4D94;">Contact</a> &middot; <a href="${ORIGIN}/partner-with-us" style="color: #FF4D94;">Partner With Us</a> &middot; <a href="${ORIGIN}/become-a-rider" style="color: #FF4D94;">Become a Rider</a></p>`;
  return `<noscript>
      <div style="font-family: system-ui, -apple-system, sans-serif; background-color: #0B0B0F; color: #ffffff; min-height: 100vh; padding: 40px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box;">
        <div style="background-color: #14141A; border: 1px solid #272732; padding: 32px; border-radius: 24px; max-width: 640px; width: 100%; box-sizing: border-box; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); margin: 0 auto; text-align: left;">
          <div style="text-align: center;">
            <div style="background-color: #E21B70; color: white; display: inline-block; padding: 12px 24px; border-radius: 16px; font-weight: 900; font-size: 24px; margin-bottom: 24px; letter-spacing: -0.5px;">DADU FOOD</div>
          </div>
          <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 12px; color: #ffffff; text-align: center;">${escapeHtmlText(h1)}</h1>
          <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 24px; text-align: center;">Please enable JavaScript to order online. You can also order directly on WhatsApp at 03277004471.</p>${sectionsHtml}${linksHtml}

          <p style="font-size: 14px; color: #e4e4e7; line-height: 1.6; margin: 0 0 8px 0;">Website: <a href="${escapeAttr(route.canonical)}" style="color: #FF4D94;">${escapeHtmlText(route.canonical)}</a> &middot; Phone / WhatsApp: 03277004471 &middot; Email: support@dadufood.pk</p>
          <p style="font-size: 11px; color: #71717a; margin: 16px 0 0 0; text-align: center;">© 2026 DADU FOOD Delivery Services. All Rights Reserved.</p>
        </div>
      </div>
    </noscript>`;
}

// Derive one route's HTML from the built index.html by replacement only.
// Everything else (verification metas, viewport, theme-color, manifest,
// favicons, #root, module script, inline PWA script) passes through
// byte-for-byte from the built file.
function renderRoute(baseHtml, route) {
  let html = baseHtml;

  html = html.replace(/<title>[^<]*<\/title>/i, () => `<title>${escapeHtmlText(route.title)}</title>`);
  html = setMetaContent(html, "name", "description", route.description);
  html = setMetaContent(html, "name", "keywords", KEYWORDS);
  html = setMetaContent(html, "property", "og:type", "website");
  html = setMetaContent(html, "property", "og:site_name", "Dadu Food");
  html = setMetaContent(html, "property", "og:title", route.title);
  html = setMetaContent(html, "property", "og:description", route.description);
  html = setMetaContent(html, "property", "og:url", route.canonical);
  html = setMetaContent(html, "property", "og:image", OG_IMAGE);
  html = setMetaContent(html, "name", "twitter:card", "summary_large_image");
  html = setMetaContent(html, "name", "twitter:title", route.title);
  html = setMetaContent(html, "name", "twitter:description", route.description);
  html = setMetaContent(html, "name", "twitter:url", route.canonical);
  html = setMetaContent(html, "name", "twitter:image", OG_IMAGE);
  html = setCanonical(html, route.canonical);
  html = setJsonLd(html, route);

  if (route.noscript) {
    const noscriptRe = /<noscript>[\s\S]*?<\/noscript>/i;
    if (!noscriptRe.test(html)) {
      console.warn(`[${PLUGIN_NAME}] no <noscript> block found — leaving as-is for ${route.path}`);
    } else {
      html = html.replace(noscriptRe, () => buildNoscript(route));
    }
  }
  // Home route (noscript: null) keeps the existing homepage noscript untouched.

  return html;
}

function runPrerender(outDir) {
  const indexPath = path.join(outDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.warn(`[${PLUGIN_NAME}] ${indexPath} not found — skipping prerendering`);
    return;
  }
  const baseHtml = fs.readFileSync(indexPath, "utf-8");

  for (const route of ROUTES) {
    const html = renderRoute(baseHtml, route);
    const outPath =
      route.path === "/"
        ? indexPath
        : path.join(outDir, route.path.replace(/^\//, ""), "index.html");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html, "utf-8");
    console.log(`[${PLUGIN_NAME}] ${route.path} -> ${path.relative(process.cwd(), outPath)}`);
  }
}

/** @returns {import("vite").Plugin} */
export function prerenderPlugin() {
  let outDir = null;
  return {
    name: PLUGIN_NAME,
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      // Fail-soft: prerendering must NEVER fail the build.
      try {
        runPrerender(outDir || path.resolve(process.cwd(), "dist"));
      } catch (err) {
        console.warn(`[${PLUGIN_NAME}] prerendering failed (build continues with the plain SPA index.html):`, err);
      }
    },
  };
}
