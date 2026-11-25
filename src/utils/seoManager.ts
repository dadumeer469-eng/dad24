import { Dish, SystemSettings } from "../types";
import { getShopProfile } from "./catalogNormalizer";

export const DADU_FOOD_BUSINESS = {
  name: "Dadu Food",
  tagline: "Fresh, hot food and daily groceries delivered fast across Dadu City in 20–35 minutes.",
  address: "Station Road, Dadu, Sindh, Pakistan",
  city: "Dadu",
  region: "Sindh",
  country: "PK",
  postalCode: "76200",
  phoneDisplay: "03277004471",
  phoneIntl: "+923277004471",
  email: "support@dadufood.pk",
  openingHoursDisplay: "09:00 AM – 11:59 PM (Daily)",
  openingHoursSchema: "Mo-Su 09:00-23:59",
  standardDeliveryFee: 50,
  smallOrderThreshold: 500,
  freeDeliveryThreshold: 1000,
  minOrder: 200,
  priceRange: "Rs. 80 – Rs. 2,500",
  deliveryAreas: [
    "Station Road",
    "Makhdoom Bilawal Nagar",
    "Civil Hospital Road",
    "Degree College Road",
    "New Bus Stand",
    "Moro Road",
    "Kacheri Road",
    "Dadu City Center",
  ],
  siteUrl: typeof window !== "undefined" ? window.location.origin : "https://dadufood.pk",
};

export interface FaqItem {
  question: string;
  answer: string;
}

export const DADU_FOOD_FAQS: FaqItem[] = [
  {
    question: "Dadu mein khana order kaise karein?",
    answer:
      "Dadu Food website kholein, apna pasandeeda restaurant ya dish select karein, cart mein add karein, aur apna phone number aur Dadu address enter karke 1 minute mein order place karein.",
  },
  {
    question: "Delivery time kitna hai?",
    answer:
      "Dadu City ke andar khana aam tor par 20 se 35 minute mein garma-garam deliver hota hai, aur aap live order tracker par rider ki status dekh sakte hain.",
  },
  {
    question: "Minimum order kitna hai?",
    answer:
      "Dadu Food par minimum order aam tor par Rs. 200 hai (kuch chai aur snack shops par Rs. 150 se shuru hota hai).",
  },
  {
    question: "Payment kaise karein (COD aur Easypaisa)?",
    answer:
      "Aap Cash on Delivery (COD) ya Easypaisa (Ghulam Murtaza · 03277004471 par transfer kar ke receipt upload) ke zariye checkout par payment kar sakte hain.",
  },
  {
    question: "Dadu Food kis area mein delivery karta hai?",
    answer:
      "Hum poore Dadu City mein delivery karte hain, jis mein Station Road, Makhdoom Bilawal Nagar, Civil Hospital Road, Degree College Road, Kacheri Road, New Bus Stand aur Moro Road shamil hain.",
  },
  {
    question: "Delivery fee kitni hai aur free delivery kab milti hai?",
    answer:
      "Standard delivery fee Rs. 50 hai. Rs. 500 se kam orders par delivery fee double (Rs. 100) hoti hai, aur Rs. 1,000 ya us se zyada ke orders par delivery bilkul FREE hai.",
  },
];

export type InfoPageSlug =
  | "about"
  | "terms"
  | "privacy-policy"
  | "refund-policy"
  | "contact"
  | "partner-with-us"
  | "become-a-rider";

export function slugifyShop(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function setOrCreateMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonicalUrl(url: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

function setJsonLd(id: string, data: object) {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

const INFO_PAGE_META: Record<InfoPageSlug, { title: string; description: string }> = {
  about: {
    title: "About Us — Dadu's Trusted Food Delivery | Dadu Food",
    description:
      "Learn how Dadu Food connects Dadu City households with trusted local restaurants and daily groceries from 9:00 AM to 11:59 PM.",
  },
  terms: {
    title: "Terms & Conditions | Dadu Food",
    description:
      "Read the Terms & Conditions for ordering food and groceries on Dadu Food in Dadu, Sindh.",
  },
  "privacy-policy": {
    title: "Privacy Policy | Dadu Food",
    description:
      "How Dadu Food collects, uses, and protects your phone number, delivery addresses, and order history.",
  },
  "refund-policy": {
    title: "Refund & Cancellation Policy | Dadu Food",
    description:
      "Clear order cancellation, missing-item refund, and Easypaisa refund timelines for Dadu Food customers.",
  },
  contact: {
    title: "Contact Dadu Food Helpline (03277004471) | Dadu Food",
    description:
      "Reach Dadu Food support on Station Road, Dadu or call/WhatsApp 03277004471 daily between 9:00 AM and 11:59 PM.",
  },
  "partner-with-us": {
    title: "Register Your Restaurant in Dadu | Dadu Food Partners",
    description:
      "Grow your Dadu restaurant, cafe, or grocery store with Dadu Food. Zero upfront setup fee and instant online orders.",
  },
  "become-a-rider": {
    title: "Become a Dadu Food Delivery Rider | Earn Daily in Dadu",
    description:
      "Join Dadu Food as a delivery rider in Dadu City. Flexible hours, daily earnings, and 100% of customer tips.",
  },
};

export function syncPageSeo(params: {
  pageType: "home" | "shop" | "info";
  shopName?: string;
  shopDishes?: Dish[];
  infoSlug?: InfoPageSlug;
  deliverySettings?: SystemSettings;
  adminSeoOverride?: { siteTitle?: string; siteDescription?: string };
}) {
  if (typeof document === "undefined") return;

  const origin = window.location.origin;
  let title = "Best Online Food Delivery in Dadu | Dadu Food";
  let description =
    "Fresh, hot food delivered fast in Dadu City. Order pizza, biryani, mutton karahi, broast, chai, and groceries online. COD & Easypaisa. Call 03277004471.";
  let canonicalPath = "/";
  let ogImage = "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&q=80&auto=format&fit=crop";

  const graphNodes: object[] = [
    {
      "@type": ["LocalBusiness", "FoodEstablishment"],
      "@id": `${origin}/#organization`,
      name: DADU_FOOD_BUSINESS.name,
      description: DADU_FOOD_BUSINESS.tagline,
      url: origin,
      telephone: DADU_FOOD_BUSINESS.phoneIntl,
      email: DADU_FOOD_BUSINESS.email,
      priceRange: DADU_FOOD_BUSINESS.priceRange,
      servesCuisine: ["Pakistani", "Fast Food", "Desi Food", "Pizza", "BBQ", "Biryani", "Tea & Chai"],
      openingHours: DADU_FOOD_BUSINESS.openingHoursSchema,
      areaServed: DADU_FOOD_BUSINESS.deliveryAreas.map((area) => ({
        "@type": "Place",
        name: `${area}, Dadu, Sindh`,
      })),
      address: {
        "@type": "PostalAddress",
        streetAddress: "Station Road",
        addressLocality: DADU_FOOD_BUSINESS.city,
        addressRegion: DADU_FOOD_BUSINESS.region,
        postalCode: DADU_FOOD_BUSINESS.postalCode,
        addressCountry: DADU_FOOD_BUSINESS.country,
      },
      paymentAccepted: "Cash on Delivery, Easypaisa",
      currenciesAccepted: "PKR",
    },
  ];

  if (params.pageType === "shop" && params.shopName) {
    const profile = getShopProfile(params.shopName, params.deliverySettings, params.shopDishes);
    const slug = slugifyShop(profile.name);
    canonicalPath = `/shop/${slug}`;
    title = `${profile.name} Menu & Online Delivery in Dadu | Dadu Food`;
    const ratingPart =
      profile.rating && profile.reviewCount > 0
        ? ` Rated ${profile.rating}/5 (${profile.reviewCount} ratings).`
        : "";
    const minPart = profile.minOrder ? `, min order Rs. ${profile.minOrder}` : "";
    description = `${profile.oneLineDescription}${ratingPart} Delivery in ${profile.deliveryTime}${minPart}.`;
    if (params.shopDishes && params.shopDishes[0]?.imageUrl) {
      ogImage = params.shopDishes[0].imageUrl;
    }

    const menuItems = (params.shopDishes || []).slice(0, 40).map((d) => ({
      "@type": "MenuItem",
      name: d.name,
      description: d.description || `${d.name} from ${profile.name} in Dadu`,
      image: d.imageUrl,
      offers: {
        "@type": "Offer",
        priceCurrency: "PKR",
        price: d.discountPrice || d.price,
        availability: d.isAvailable === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      },
    }));

    const restaurantNode: Record<string, unknown> = {
      "@type": "Restaurant",
      "@id": `${origin}${canonicalPath}#restaurant`,
      name: profile.name,
      description: profile.oneLineDescription,
      url: `${origin}${canonicalPath}`,
      image: ogImage,
      telephone: DADU_FOOD_BUSINESS.phoneIntl,
      servesCuisine: profile.servesCuisine,
      priceRange: profile.priceRange,
      openingHours: DADU_FOOD_BUSINESS.openingHoursSchema,
      address: {
        "@type": "PostalAddress",
        streetAddress: "Station Road",
        addressLocality: "Dadu",
        addressRegion: "Sindh",
        addressCountry: "PK",
      },
      hasMenu: {
        "@type": "Menu",
        name: `${profile.name} Full Menu`,
        hasMenuSection: [
          {
            "@type": "MenuSection",
            name: "Menu Items",
            hasMenuItem: menuItems,
          },
        ],
      },
    };
    if (profile.rating && profile.reviewCount > 0) {
      restaurantNode.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: profile.rating,
        reviewCount: profile.reviewCount,
      };
    }
    graphNodes.push(restaurantNode);
  } else if (params.pageType === "info" && params.infoSlug) {
    const info = INFO_PAGE_META[params.infoSlug];
    title = info.title;
    description = info.description;
    canonicalPath = `/${params.infoSlug}`;
  } else {
    // Homepage: apply admin override only if it's meaningful Dadu content (not generic placeholder)
    if (params.adminSeoOverride?.siteTitle && params.adminSeoOverride.siteTitle.toLowerCase().includes("dadu")) {
      title = params.adminSeoOverride.siteTitle;
    }
    if (params.adminSeoOverride?.siteDescription && params.adminSeoOverride.siteDescription.toLowerCase().includes("dadu")) {
      description = params.adminSeoOverride.siteDescription;
    }

    graphNodes.push({
      "@type": "FAQPage",
      mainEntity: DADU_FOOD_FAQS.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.answer,
        },
      })),
    });

    graphNodes.push({
      "@type": "WebPage",
      name: title,
      url: `${origin}/`,
      description,
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: [".speakable-summary", ".faq-answer"],
      },
    });
  }

  const canonicalUrl = `${origin}${canonicalPath}`;
  document.title = title;
  setCanonicalUrl(canonicalUrl);

  setOrCreateMeta("name", "description", description);
  setOrCreateMeta("property", "og:type", "website");
  setOrCreateMeta("property", "og:site_name", "Dadu Food");
  setOrCreateMeta("property", "og:title", title);
  setOrCreateMeta("property", "og:description", description);
  setOrCreateMeta("property", "og:url", canonicalUrl);
  setOrCreateMeta("property", "og:image", ogImage);
  setOrCreateMeta("name", "twitter:card", "summary_large_image");
  setOrCreateMeta("name", "twitter:title", title);
  setOrCreateMeta("name", "twitter:description", description);
  setOrCreateMeta("name", "twitter:image", ogImage);

  setJsonLd("dadu-dynamic-jsonld", {
    "@context": "https://schema.org",
    "@graph": graphNodes,
  });
}
