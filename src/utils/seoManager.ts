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
  openingHoursDisplay: "12:00 PM – 11:00 PM (Daily)",
  openingHoursSchema: "Mo-Su 12:00-23:00",
  standardDeliveryFee: 50,
  medicineDeliveryFee: 30,
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
  siteUrl: typeof window !== "undefined" ? window.location.origin : "https://dadufood.store",
};

export interface FaqItem {
  question: string;
  answer: string;
}

export const DADU_FOOD_FAQS: FaqItem[] = [
  {
    question: "What is Dadu Food?",
    answer: "Dadu Food is an online food delivery service for Dadu city, Sindh, Pakistan. You can order food from local restaurants, groceries, and medicines through one website, dadufood.store, and get them delivered to your home in 20 to 35 minutes.",
  },
  {
    question: "Where does Dadu Food deliver?",
    answer: "Dadu Food delivers across Dadu city, Sindh, including Shahani Paro, Moro Road, Station Road, College Road, and nearby areas. Enter your address or share your live location on dadufood.store, and the app will confirm whether delivery is available to you.",
  },
  {
    question: "What are Dadu Food's opening hours?",
    answer: "Dadu Food delivers food from 12:00 PM to 11:00 PM every day, seven days a week. Grocery and medicine orders can be placed from the morning. Orders placed outside food hours will be accepted once the restaurants open at 12:00 PM.",
  },
  {
    question: "How much is the delivery fee on Dadu Food?",
    answer: "The delivery fee on Dadu Food is a flat Rs 50 per order for food and groceries, anywhere in Dadu city. Medicine-only orders have a separate, lower delivery fee of Rs 30. There are no hidden charges — the fee is shown clearly at checkout before you confirm your order.",
  },
  {
    question: "How can I pay for my Dadu Food order?",
    answer: "You can pay in two ways on Dadu Food: Cash on Delivery (COD) — pay the rider in cash when your order arrives — or Easypaisa. Dadu Food does not accept JazzCash or card payments. Choose your payment method at checkout before placing the order.",
  },
  {
    question: "How do I order food on Dadu Food?",
    answer: "Open dadufood.store, allow location access, browse restaurants and menus, add dishes to your cart, and check out. Enter your name, phone number, and delivery address, choose Cash on Delivery or Easypaisa, and confirm. Your food will arrive in 20 to 35 minutes.",
  },
  {
    question: "Which restaurants are on Dadu Food?",
    answer: "Dadu Food lists local Dadu restaurants including Dadu Fast Food & Kitchen, S M Bilal Hotel, and Tasty Bites Dadu, with more restaurants being added before the grand opening. Each restaurant's full menu, prices, and delivery time are shown on dadufood.store.",
  },
  {
    question: "Can I order groceries on Dadu Food?",
    answer: "Yes. Dadu Food delivers groceries across Dadu city, with 297 grocery items in 13 categories including atta, rice, cooking oil, tea, milk, spices, snacks, personal care, cleaning products, and household items. Grocery orders can be placed from the morning.",
  },
  {
    question: "Can I order medicines on Dadu Food?",
    answer: "Yes. Dadu Food has a Medicine & Pharmacy category, so you can order medicines and health products for home delivery in Dadu city. Browse the pharmacy section on dadufood.store, add medicines to your cart, and pay by Cash on Delivery or Easypaisa.",
  },
  {
    question: "How long does Dadu Food delivery take?",
    answer: "Dadu Food delivers most orders in 20 to 35 minutes from the time you confirm your order. Delivery time depends on the restaurant's preparation time and your distance from it. You can track your order live on the website after placing it.",
  },
  {
    question: "Is there a minimum order on Dadu Food?",
    answer: "Dadu Food has no published minimum order amount, so you can order even a single dish or a single grocery item. The flat Rs 50 delivery fee applies to food and grocery orders, and Rs 30 to medicine-only orders. The total, including the delivery fee, is shown before checkout.",
  },
  {
    question: "How can I track my Dadu Food order?",
    answer: "After placing your order on dadufood.store, you can track it live on the website. The order status shows when the restaurant accepts it, when the rider picks it up, and when it is on its way to you. You can also contact Dadu Food on WhatsApp at 03277004471.",
  },
  {
    question: "How do I contact Dadu Food?",
    answer: "You can contact Dadu Food by phone or WhatsApp on 03277004471. You can also order directly through the website, dadufood.store. For help with an order, a missing item, or a payment issue, message or call the same number during delivery hours.",
  },
  {
    question: "Dadu Food se khana kaise order karein?",
    answer: "Dadu Food se khana order karna bohat asaan hai. dadufood.store kholein, apni location allow karein, restaurant aur khana pasand karein, cart mein add karein aur checkout par apna naam, number aur address likhein. Cash on Delivery ya Easypaisa se payment karein — khana 20 se 35 minute mein ghar pahunchega.",
  },
  {
    question: "Dadu Food kab se shuru ho raha hai?",
    answer: "Dadu Food ki grand opening Tuesday, 15 December 2026 ko ho rahi hai. Us din se Dadu city mein khana, grocery aur dawaai ki home delivery shuru ho jayegi. Opening se pehle aap dadufood.store par restaurants aur grocery items dekh sakte hain.",
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
      "Learn how Dadu Food connects Dadu City households with trusted local restaurants and daily groceries from 12:00 PM to 11:00 PM.",
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
      "Reach Dadu Food support on Station Road, Dadu or call/WhatsApp 03277004471 daily between 12:00 PM and 11:00 PM.",
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
  let title = "Food Delivery in Dadu | Dadu Food — 20–35 Min, Rs 50, COD & Easypaisa";
  let description =
    "Food delivery in Dadu, Sindh — biryani, pizza, zinger burgers, karahi & groceries delivered in 20–35 min for Rs 50. Cash on Delivery & Easypaisa. Call 03277004471.";
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
      geo: {
        "@type": "GeoCoordinates",
        latitude: "26.7323",
        longitude: "67.7735",
      },
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

  // BreadcrumbList: Home > current page (shop / info). Home itself has a
  // single-item breadcrumb in the static JSON-LD in index.html.
  if (canonicalPath !== "/") {
    const crumbName =
      params.pageType === "shop" && params.shopName
        ? params.shopName
        : params.pageType === "info" && params.infoSlug
          ? INFO_PAGE_META[params.infoSlug].title.replace(/ \| Dadu Food.*$/, "")
          : "Home";
    graphNodes.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${origin}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: crumbName,
          item: `${origin}${canonicalPath}`,
        },
      ],
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
