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
  medicineDeliveryFee: 30,
  smallOrderThreshold: 500,
  freeDeliveryThreshold: 1000,
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
  siteUrl: typeof window !== "undefined" ? window.location.origin : "https://www.dadufood.store",
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
    answer: "The delivery fee on Dadu Food is Rs 70 per order for food, Rs 100 for groceries, and Rs 30 for medicine-only orders, anywhere in Dadu city. Every order also carries a flat Rs 12 site tax. There are no hidden charges — the fee is shown clearly at checkout before you confirm your order.",
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
    answer: "Dadu Food has no published minimum order amount, so you can order even a single dish or a single grocery item. The delivery fee is Rs 70 for food orders, Rs 100 for grocery orders, and Rs 30 for medicine-only orders, plus a flat Rs 12 site tax per order. The total, including the delivery fee, is shown before checkout.",
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
  {
    question: "Can I order pizza in Dadu on Dadu Food?",
    answer: "Yes. Dadu Food delivers pizza in Dadu from Dadu Fast Food & Kitchen and Tasty Bites Dadu — freshly baked pizzas, along with zinger burgers, crispy broast, creamy pasta and loaded lasagna. Order pizza online in Dadu on dadufood.store and get it delivered hot in 20 to 35 minutes for Rs 70. Pay by Cash on Delivery or Easypaisa.",
  },
  {
    question: "What food can I order in Dadu on Dadu Food?",
    answer: "On Dadu Food you can order chicken biryani, zinger burgers, chicken shawarma, chicken karahi, BBQ, seekh kababs, pizza, creamy pasta, lasagna, grilled sandwiches and crispy broast from Dadu Fast Food & Kitchen, S M Bilal Hotel and Tasty Bites Dadu. All food is delivered hot across Dadu city in 20 to 35 minutes for Rs 70.",
  },
  {
    question: "Does Dadu Food deliver outside Dadu city?",
    answer: "No — Dadu Food delivers within Dadu city only, including Shahani Paro, Moro Road, Station Road, College Road, Makhdoom Bilawal Nagar, Civil Hospital Road, Degree College Road, New Bus Stand, Kacheri Road and Dadu City Center. If you are outside the city, the app will tell you delivery is not available when you enter your address.",
  },
  {
    question: "How do I get free delivery on Dadu Food?",
    answer: "There are two ways to get free delivery on Dadu Food. Your first order gets free delivery on anything — food, groceries or medicines. After that, any order of Rs 1,000 or more gets free delivery. Below Rs 1,000 the delivery fee is Rs 70 for food orders, Rs 100 for grocery orders, and Rs 30 for medicine-only orders.",
  },
  {
    question: "Is the delivery fee higher on small orders?",
    answer: "Yes. Orders below Rs 500 carry double the delivery fee — Rs 140 instead of Rs 70 for food orders, Rs 200 instead of Rs 100 for grocery orders, and Rs 60 instead of Rs 30 for medicine-only orders. Orders of Rs 500 or more pay the normal fee, and orders of Rs 1,000 or more get free delivery. Your first order is always free delivery, whatever the total.",
  },
  {
    question: "How do I pay with Easypaisa on Dadu Food?",
    answer: "At checkout, choose Easypaisa. The app shows the Easypaisa account name Ghulam Murtaza and number 03277004471 with a Copy button. Send the payment from your own Easypaisa app, then upload a screenshot of the payment receipt on the same screen. Your order is saved as payment verification pending, and the Dadu Food admin checks your receipt — once it is verified, your order is confirmed and sent to the restaurant and rider. Never send money to any other number.",
  },
  {
    question: "Can I see my rider's live location on the map?",
    answer: "Yes. Once the rider picks up your order, you can follow the rider live on the map in the order tracker on dadufood.store — the rider's pin moves as they travel towards you. The tracker also shows every stage of your order: confirmed, cooking, picked up and on the way.",
  },
  {
    question: "How do I cancel my Dadu Food order?",
    answer: "If your order has not started cooking yet, you can cancel it free of charge — message or call Dadu Food on WhatsApp at 03277004471 with your Order ID. If you already paid by Easypaisa, the amount is refunded within 24 hours. Once the kitchen has started preparing your food, the order can no longer be cancelled. If an item arrives missing, wrong, spilled or damaged, report it within 30 minutes on WhatsApp with your Order ID and a photo, and Dadu Food will replace it or refund it.",
  },
  {
    question: "Can I order groceries in the morning before restaurants open?",
    answer: "Yes. Grocery and medicine orders can be placed from the morning, even though restaurants only start serving food at 12:00 PM. So you can order atta, rice, cooking oil, tea, milk and other groceries early in the day, and they are delivered in 20 to 35 minutes for the flat Rs 100 grocery delivery fee. Food orders are only accepted from 12:00 PM to 11:00 PM.",
  },
  {
    question: "What medicines can I order on Dadu Food?",
    answer: "Dadu Food's pharmacy lists 11 essential, commonly used over-the-counter medicines — the everyday medicines Dadu families need most. Browse the Medicine & Pharmacy section on dadufood.store, add what you need, and it is delivered to your home in 20 to 35 minutes for the lower Rs 30 medicine delivery fee. Pay by Cash on Delivery or Easypaisa. Medicine orders can be placed from the morning.",
  },
  {
    question: "How can I become a Dadu Food rider?",
    answer: "Fill in the rider application form on the Become a Rider page on dadufood.store with your name, mobile number, vehicle type, your mohalla or area in Dadu, your preferred shift — morning, evening or full day — and whether your CNIC is available. There is no fee to apply. You need your own vehicle, a motorbike, electric bike or bicycle, a mobile phone for the rider panel, and good knowledge of Dadu city. Riders earn a payout for every order delivered and keep 100% of customer tips. You can also call or WhatsApp 03277004471 to ask first.",
  },
  {
    question: "How can I list my restaurant or shop on Dadu Food?",
    answer: "Fill in the partner application form on the Partner With Us page on dadufood.store with your shop name, the owner or manager's name, your WhatsApp number and your shop address in Dadu. Dadu Food charges a simple 10% commission on each order — no upfront setup fee and no monthly fee, so you keep 90% of every order. The onboarding team will call you within 24 hours to confirm your menu, prices and hours, and your shop usually goes live within a day or two. You can also call or WhatsApp 03277004471.",
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
  pageType: "home" | "shop" | "info" | "grocery" | "pharmacy" | "restaurants" | "hotels";
  shopName?: string;
  shopDishes?: Dish[];
  infoSlug?: InfoPageSlug;
  deliverySettings?: SystemSettings;
  adminSeoOverride?: { siteTitle?: string; siteDescription?: string };
}) {
  if (typeof document === "undefined") return;

  // Canonical domain: always https://www.dadufood.store, even when the visitor
  // is on dadufood.vercel.app. Otherwise Google sees two versions and picks the
  // Vercel URL as canonical, and the .store homepage never gets indexed.
  // (The apex dadufood.store 308-redirects to www, so www is the one host.)
  const origin = "https://www.dadufood.store";
  let title = "Food Delivery in Dadu | Dadu Food — 20–35 Min";
  let description =
    "Food delivery in Dadu, Sindh — biryani, pizza, zinger burgers, karahi & groceries delivered in 20–35 min. Cash on Delivery & Easypaisa. Call 03277004471.";
  let canonicalPath = "/";
  let ogImage = "https://www.dadufood.store/og-image.jpg";

  const graphNodes: object[] = [
    {
      "@type": ["LocalBusiness", "FoodEstablishment"],
      "@id": `${origin}/#organization`,
      name: DADU_FOOD_BUSINESS.name,
      description: DADU_FOOD_BUSINESS.tagline,
      url: origin,
      image: "https://www.dadufood.store/og-image.jpg",
      telephone: DADU_FOOD_BUSINESS.phoneIntl,
      email: DADU_FOOD_BUSINESS.email,
      geo: {
        "@type": "GeoCoordinates",
        latitude: "26.7323",
        longitude: "67.7735",
      },
      priceRange: DADU_FOOD_BUSINESS.priceRange,
      servesCuisine: ["Pakistani", "Fast Food", "Desi Food", "Pizza", "Burgers", "BBQ", "Biryani", "Tea & Chai"],
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "12:00",
        closes: "23:00",
      },
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

    // Product/Offer schema (seo-audit.md fix #4): one Product node per dish,
    // priced ONLY from the real catalogue (Dish.price / discountPrice passed
    // in as shopDishes — never invented). This mirrors the priced MenuItem
    // offers above, so dish prices are visible to search/AI crawlers as
    // products as well as menu items. Grocery/medicine Product schema is
    // not added here: syncPageSeo receives no grocery/medicine catalogue
    // data (its grocery/pharmacy branches take no product params), so there
    // is no real price source to use — plumbing that data in is follow-up
    // work in App.tsx (not an seoManager change).
    for (const d of (params.shopDishes || []).slice(0, 40)) {
      graphNodes.push({
        "@type": "Product",
        name: d.name,
        description: d.description || `${d.name} from ${profile.name} in Dadu`,
        image: d.imageUrl,
        brand: { "@type": "Brand", name: profile.name },
        offers: {
          "@type": "Offer",
          priceCurrency: "PKR",
          price: d.discountPrice || d.price,
          availability: d.isAvailable === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
        },
      });
    }
  } else if (params.pageType === "info" && params.infoSlug) {
    const info = INFO_PAGE_META[params.infoSlug];
    title = info.title;
    description = info.description;
    canonicalPath = `/${params.infoSlug}`;
  } else if (params.pageType === "grocery") {
    title = "Grocery Delivery in Dadu | Dadu Food";
    description =
      "Grocery delivery in Dadu — 297 items in 13 categories, delivered in 20–35 min for Rs 100. Order from the morning. Cash on Delivery & Easypaisa. Call 03277004471";
    canonicalPath = "/grocery";
  } else if (params.pageType === "pharmacy") {
    title = "Medicine Delivery in Dadu | Dadu Food";
    description =
      "Medicine delivery in Dadu — 11 medicines delivered to your home for Rs 30. Cash on Delivery & Easypaisa. Order from the morning. Call 03277004471.";
    canonicalPath = "/pharmacy";
  } else if (params.pageType === "restaurants") {
    title = "Restaurants in Dadu — Order Food Online | Dadu Food";
    description =
      "Restaurants in Dadu — order food online from Dadu Fast Food & Kitchen, S M Bilal Hotel & Tasty Bites Dadu. Biryani, pizza, karahi & BBQ in 20–35 min, Rs 70.";
    canonicalPath = "/restaurants";
  } else if (params.pageType === "hotels") {
    title = "Hotels in Dadu — Order Food Online | Dadu Food";
    description =
      "Hotels in Dadu — S M Bilal Hotel: BBQ, mutton karahi, seekh kababs & tandoori naan delivered in 20–35 min for Rs 70. More Dadu hotels joining soon.";
    canonicalPath = "/hotels";
  } else {
    // Homepage: apply admin override only if it's meaningful Dadu content (not generic placeholder)
    if (params.adminSeoOverride?.siteTitle && params.adminSeoOverride.siteTitle.toLowerCase().includes("dadu")) {
      title = params.adminSeoOverride.siteTitle;
    }
    if (params.adminSeoOverride?.siteDescription && params.adminSeoOverride.siteDescription.toLowerCase().includes("dadu")) {
      description = params.adminSeoOverride.siteDescription;
    }

    // Homepage: the 27 FAQs are rendered VISIBLY on the page (App.tsx FAQ
    // section + the prerendered noscript in index.html), so the FAQPage
    // node describes real on-page content. Keep in sync with
    // scripts/prerender-routes.mjs (same 27 questions, verbatim).
    graphNodes.push({
      "@type": "FAQPage",
      mainEntity: DADU_FOOD_FAQS.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
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

  // BreadcrumbList: Home > current page (shop / info / grocery / pharmacy / restaurants / hotels).
  // Home itself has no breadcrumb node (the static JSON-LD block that used to
  // carry one was removed from index.html; seoManager is the only source).
  if (canonicalPath !== "/") {
    const crumbName =
      params.pageType === "shop" && params.shopName
        ? params.shopName
        : params.pageType === "info" && params.infoSlug
          ? INFO_PAGE_META[params.infoSlug].title.replace(/ \| Dadu Food.*$/, "")
          : params.pageType === "grocery"
            ? "Grocery Delivery in Dadu"
            : params.pageType === "pharmacy"
              ? "Medicine Delivery in Dadu"
              : params.pageType === "restaurants"
                ? "Restaurants in Dadu"
                : params.pageType === "hotels"
                  ? "Hotels in Dadu"
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
