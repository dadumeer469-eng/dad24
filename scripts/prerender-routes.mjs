// Per-route SEO data for build-time prerendering (scripts/prerender-plugin.mjs).
//
// IMPORTANT — KEEP IN SYNC WITH src/utils/seoManager.ts:
// The titles, descriptions, canonical URLs and JSON-LD nodes below are copied
// VERBATIM from seoManager.ts (INFO_PAGE_META, the home/grocery/pharmacy
// branches, DADU_FOOD_BUSINESS and SHOP_DESCRIPTIONS in
// src/utils/catalogNormalizer.ts). If any of those change, update this file
// to match — the prerendered HTML is what Google sees before JavaScript runs,
// and at runtime syncPageSeo() overwrites the same tags with the same values,
// so the two sources must agree.
//
// Canonical host is ALWAYS https://www.dadufood.store (apex 308-redirects to
// www; dadufood.vercel.app redirects to www). Never use another host here.
//
// Shop descriptions are oneLineDescription + " Delivery in 20–35 min." — the
// same wording the shop intro copy in src/components/FoodpandaRestaurantPage.tsx
// uses. (syncPageSeo builds the same string from the shop's configured
// delivery time; if a shop's configured delivery time ever changes, update
// the description here to match.)
//
// Shop menu items list REAL dish kinds only, WITHOUT prices (prices change;
// never invent them), and there is NO aggregateRating (no real ratings).

export const ORIGIN = "https://www.dadufood.store";
export const OG_IMAGE = "https://www.dadufood.store/og-image.jpg";
export const PHONE_INTL = "+923277004471";
export const PHONE_DISPLAY = "03277004471";

// Best search keywords for Dadu Food (28 Nov 2026) — copied VERBATIM from
// src/utils/seoManager.ts DADU_FOOD_KEYWORDS. Set as meta name="keywords" on
// every prerendered route (plugin renderRoute). Keep in sync with seoManager.
export const KEYWORDS =
  "food delivery Dadu, Dadu food delivery, order food online Dadu, Dadu restaurant, Dadu biryani, Dadu fast food, Dadu pizza, Dadu zinger burger, Dadu shawarma, Dadu karahi, Dadu chicken biryani, Dadu beef biryani, grocery delivery Dadu, Dadu grocery, online grocery Dadu, pharmacy Dadu, medicine delivery Dadu, Dadu medicine home delivery, Dadu Food, online food order Dadu Sindh, Dadu home delivery, Dadu food order, Dadu fast food delivery, Dadu food app, Dadu restaurant delivery";

// ---------------------------------------------------------------------------
// Shared LocalBusiness / FoodEstablishment node (copied from seoManager.ts:
// DADU_FOOD_BUSINESS + the graph node built in syncPageSeo). Present on
// EVERY route.
// ---------------------------------------------------------------------------
export function localBusinessNode() {
  return {
    "@type": ["LocalBusiness", "FoodEstablishment"],
    "@id": `${ORIGIN}/#organization`,
    name: "Dadu Food",
    description:
      "Fresh, hot food and daily groceries delivered fast across Dadu City in 20–35 minutes.",
    url: ORIGIN,
    image: OG_IMAGE,
    telephone: PHONE_INTL,
    email: "support@dadufood.pk",
    geo: {
      "@type": "GeoCoordinates",
      latitude: "26.7323",
      longitude: "67.7735",
    },
    priceRange: "Rs. 80 – Rs. 2,500",
    servesCuisine: ["Pakistani", "Fast Food", "Desi Food", "Pizza", "Burgers", "BBQ", "Biryani", "Tea & Chai"],
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "12:00",
      closes: "23:00",
    },
    openingHours: "Mo-Su 12:00-23:00",
    areaServed: [
      "Station Road",
      "Makhdoom Bilawal Nagar",
      "Civil Hospital Road",
      "Degree College Road",
      "New Bus Stand",
      "Moro Road",
      "Kacheri Road",
      "Dadu City Center",
    ].map((area) => ({ "@type": "Place", name: `${area}, Dadu, Sindh` })),
    address: {
      "@type": "PostalAddress",
      streetAddress: "Station Road",
      addressLocality: "Dadu",
      addressRegion: "Sindh",
      postalCode: "76200",
      addressCountry: "PK",
    },
    paymentAccepted: "Cash on Delivery, Easypaisa",
    currenciesAccepted: "PKR",
  };
}

function breadcrumbNode(crumbName, canonical) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${ORIGIN}/` },
      { "@type": "ListItem", position: 2, name: crumbName, item: canonical },
    ],
  };
}

// ---------------------------------------------------------------------------
// The 27 homepage FAQs — VERBATIM copy of DADU_FOOD_FAQS in
// src/utils/seoManager.ts (same questions + answers, same order). They are
// rendered visibly on the homepage (App.tsx FAQ section + the noscript in
// index.html), so the FAQPage node in buildJsonLd describes real on-page
// content. If any FAQ changes in seoManager.ts, change it here too.
// ---------------------------------------------------------------------------
export const FAQS = [
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

// ---------------------------------------------------------------------------
// Route table — exactly the 15 sitemap URLs. /admin is NOT prerendered.
// Each route: path (URL), title, description, canonical, breadcrumb name
// (null = home, no breadcrumb node), jsonLd kind, noscript content.
// noscript: null means "keep the homepage noscript already in index.html"
// (only the home route uses this).
// ---------------------------------------------------------------------------
export const ROUTES = [
  // HOME H1 NOTE (2026-11-27): the prerendered homepage H1 lives in
  // index.html (<h1> "Food Delivery in Dadu — Dadu Food"), NOT in this file
  // — this route keeps noscript: null so the plugin leaves the homepage
  // noscript untouched. To align it with the visible React H1 ("Dadu Food —
  // Fast Delivery", App.tsx motion.h1), change that <h1> in index.html.
  // index.html is outside the SEO agent's file ownership; flagged to the
  // coordinator in fix-B-seo.md.
  {
    path: "/",
    title: "Food Delivery in Dadu | Dadu Food — 20–35 Min",
    description:
      "Food delivery in Dadu, Sindh — biryani, pizza, zinger burgers, karahi & groceries delivered in 20–35 min. Cash on Delivery & Easypaisa. Call 03277004471.",
    canonical: `${ORIGIN}/`,
    breadcrumb: null,
    jsonLd: "home",
    noscript: null,
  },

  // --- Shop pages ----------------------------------------------------------
  {
    path: "/shop/dadu-fast-food-kitchen",
    title: "Dadu Fast Food & Kitchen Menu & Online Delivery in Dadu | Dadu Food",
    description:
      "Freshly baked pizzas, zinger burgers, crispy broast, and deals across Dadu. Delivery in 20–35 min.",
    canonical: `${ORIGIN}/shop/dadu-fast-food-kitchen`,
    breadcrumb: "Dadu Fast Food & Kitchen",
    jsonLd: "shop",
    shop: {
      name: "Dadu Fast Food & Kitchen",
      oneLineDescription: "Freshly baked pizzas, zinger burgers, crispy broast, and deals across Dadu.",
      servesCuisine: ["Fast Food", "Pizza", "Burgers", "Broast"],
      // Real dish kinds from the shop intro in FoodpandaRestaurantPage.tsx.
      menuItems: ["Zinger Burger", "Chicken Biryani", "Pizza", "Crispy Broast"],
    },
    noscript: {
      h1: "Dadu Fast Food & Kitchen",
      sections: [
        {
          h2: "Order online from Dadu Fast Food & Kitchen in Dadu",
          p: "Looking for chicken biryani Dadu or a crispy zinger burger Dadu? Dadu Fast Food & Kitchen serves freshly baked pizzas, zinger burgers and crispy broast across Dadu city, delivered hot in 20–35 minutes for Rs 70. Pay by Cash on Delivery or Easypaisa.",
        },
        {
          h2: "Delivery hours & payment",
          p: "Food delivery runs daily from 12:00 PM to 11:00 PM. Delivery fee Rs 70. Pay by Cash on Delivery or Easypaisa. Call or WhatsApp 03277004471. Address: Station Road, Dadu, Sindh 76200.",
        },
      ],
    },
  },
  {
    path: "/shop/s-m-bilal-hotel",
    title: "S M Bilal Hotel Menu & Online Delivery in Dadu | Dadu Food",
    description:
      "Dadu BBQ, mutton karahi, seekh kababs, and fresh tandoori naan. Delivery in 20–35 min.",
    canonical: `${ORIGIN}/shop/s-m-bilal-hotel`,
    breadcrumb: "S M Bilal Hotel",
    jsonLd: "shop",
    shop: {
      name: "S M Bilal Hotel",
      oneLineDescription: "Dadu BBQ, mutton karahi, seekh kababs, and fresh tandoori naan.",
      servesCuisine: ["Desi Food", "BBQ", "Karahi"],
      menuItems: ["Mutton Karahi", "Chicken Karahi", "Seekh Kabab", "Tandoori Naan", "BBQ"],
    },
    noscript: {
      h1: "S M Bilal Hotel — Dadu",
      sections: [
        {
          h2: "Order online from S M Bilal Hotel in Dadu",
          p: "S M Bilal Hotel is the place for chicken karahi Dadu and BBQ Dadu — mutton karahi, seekh kababs and fresh tandoori naan, delivered hot across Dadu city in 20–35 minutes. Delivery is Rs 70 and you can pay by Cash on Delivery or Easypaisa.",
        },
        {
          h2: "Delivery hours & payment",
          p: "Food delivery runs daily from 12:00 PM to 11:00 PM. Delivery fee Rs 70. Pay by Cash on Delivery or Easypaisa. Call or WhatsApp 03277004471. Address: Station Road, Dadu, Sindh 76200.",
        },
      ],
    },
  },
  {
    path: "/shop/tasty-bites-dadu",
    title: "Tasty Bites Dadu Menu & Online Delivery in Dadu | Dadu Food",
    description:
      "Creamy pastas, loaded lasagna, grilled sandwiches, and pizzas in Dadu. Delivery in 20–35 min.",
    canonical: `${ORIGIN}/shop/tasty-bites-dadu`,
    breadcrumb: "Tasty Bites Dadu",
    jsonLd: "shop",
    shop: {
      name: "Tasty Bites Dadu",
      oneLineDescription: "Creamy pastas, loaded lasagna, grilled sandwiches, and pizzas in Dadu.",
      servesCuisine: ["Pizza", "Pasta", "Lasagna", "Sandwich"],
      menuItems: ["Pizza", "Creamy Pasta", "Loaded Lasagna", "Grilled Sandwich", "Chicken Shawarma"],
    },
    noscript: {
      h1: "Tasty Bites Dadu",
      sections: [
        {
          h2: "Order online from Tasty Bites Dadu in Dadu",
          p: "Tasty Bites Dadu serves pizza in Dadu — creamy pastas, loaded lasagna, grilled sandwiches and fresh pizzas — along with chicken shawarma Dadu orders. Everything is delivered hot in 20–35 minutes for Rs 70, with Cash on Delivery or Easypaisa.",
        },
        {
          h2: "Delivery hours & payment",
          p: "Food delivery runs daily from 12:00 PM to 11:00 PM. Delivery fee Rs 70. Pay by Cash on Delivery or Easypaisa. Call or WhatsApp 03277004471. Address: Station Road, Dadu, Sindh 76200.",
        },
      ],
    },
  },

  // --- Grocery / Pharmacy ---------------------------------------------------
  {
    path: "/grocery",
    title: "Grocery Delivery in Dadu | Dadu Food",
    description:
      "Grocery delivery in Dadu — 297 items in 13 categories, delivered in 20–35 min for Rs 100. Order from the morning. Cash on Delivery & Easypaisa. Call 03277004471",
    canonical: `${ORIGIN}/grocery`,
    breadcrumb: "Grocery Delivery in Dadu",
    jsonLd: "standard",
    noscript: {
      h1: "Grocery Delivery in Dadu",
      sections: [
        {
          h2: "Grocery delivery in Dadu — 297 items in 13 categories",
          p: "Dadu Food delivers groceries across Dadu city — 297 grocery items in 13 categories, including atta, rice, cooking oil, tea, milk, spices, snacks, personal care, cleaning products and household items. Grocery orders can be placed from the morning.",
        },
        {
          h2: "Delivery fee & payment",
          p: "Delivery fee Rs 100 for grocery orders, delivered in 20–35 minutes. Pay by Cash on Delivery or Easypaisa. Call or WhatsApp 03277004471. Address: Station Road, Dadu, Sindh 76200.",
        },
      ],
    },
  },
  {
    path: "/pharmacy",
    title: "Medicine Delivery in Dadu | Dadu Food",
    description:
      "Medicine delivery in Dadu — 11 medicines delivered to your home for Rs 30. Cash on Delivery & Easypaisa. Order from the morning. Call 03277004471.",
    canonical: `${ORIGIN}/pharmacy`,
    breadcrumb: "Medicine Delivery in Dadu",
    jsonLd: "standard",
    noscript: {
      h1: "Medicine Delivery in Dadu",
      sections: [
        {
          h2: "Medicine delivery in Dadu — 11 medicines",
          p: "Dadu Food has a Medicine & Pharmacy category, so you can order medicines and health products for home delivery in Dadu city. Medicine orders can be placed from the morning, and are delivered to your home for a Rs 30 medicine-only delivery fee.",
        },
        {
          h2: "Payment & contact",
          p: "Pay by Cash on Delivery or Easypaisa. Call or WhatsApp 03277004471. Address: Station Road, Dadu, Sindh 76200.",
        },
      ],
    },
  },

  {
    path: "/restaurants",
    title: "Restaurants in Dadu — Order Food Online | Dadu Food",
    description:
      "Restaurants in Dadu — order food online from Dadu Fast Food & Kitchen, S M Bilal Hotel & Tasty Bites Dadu. Biryani, pizza, karahi & BBQ in 20–35 min, Rs 70.",
    canonical: `${ORIGIN}/restaurants`,
    breadcrumb: "Restaurants in Dadu",
    jsonLd: "standard",
    noscript: {
      h1: "Restaurants in Dadu",
      sections: [
        {
          h2: "Restaurants in Dadu — order food online",
          p: "Order food online in Dadu from Dadu Fast Food & Kitchen, S M Bilal Hotel and Tasty Bites Dadu. Dadu Fast Food & Kitchen serves freshly baked pizzas, zinger burgers and crispy broast; S M Bilal Hotel serves Dadu BBQ, mutton karahi, seekh kababs and fresh tandoori naan; Tasty Bites Dadu serves creamy pastas, loaded lasagna, grilled sandwiches and pizzas. Biryani, zinger burgers, pizza, karahi and BBQ are delivered hot across Dadu city in 20–35 minutes for Rs 70. Pay by Cash on Delivery or Easypaisa.",
        },
        {
          h2: "Delivery hours & payment",
          p: "Food delivery runs daily from 12:00 PM to 11:00 PM. Delivery fee Rs 70. Pay by Cash on Delivery or Easypaisa. Call or WhatsApp 03277004471. Address: Station Road, Dadu, Sindh 76200.",
        },
      ],
    },
  },
  {
    path: "/hotels",
    title: "Hotels in Dadu — Order Food Online | Dadu Food",
    description:
      "Hotels in Dadu — S M Bilal Hotel: BBQ, mutton karahi, seekh kababs & tandoori naan delivered in 20–35 min for Rs 70. More Dadu hotels joining soon.",
    canonical: `${ORIGIN}/hotels`,
    breadcrumb: "Hotels in Dadu",
    jsonLd: "standard",
    noscript: {
      h1: "Hotels in Dadu",
      sections: [
        {
          h2: "Hotels in Dadu — S M Bilal Hotel",
          p: "S M Bilal Hotel is the only hotel listed on Dadu Food so far. It serves Dadu BBQ, mutton karahi, seekh kababs and fresh tandoori naan, delivered hot across Dadu city in 20–35 minutes for Rs 70. Pay by Cash on Delivery or Easypaisa.",
        },
        {
          h2: "More hotels joining soon",
          p: "More hotels in Dadu are joining Dadu Food soon. If you run a hotel in Dadu, list your hotel with us — apply at /partner-with-us or call or WhatsApp 03277004471. Food delivery runs daily from 12:00 PM to 11:00 PM. Address: Station Road, Dadu, Sindh 76200.",
        },
      ],
    },
  },

  // --- Info pages (title + description VERBATIM from INFO_PAGE_META in
  // seoManager.ts; noscript H1 + copy from src/components/InfoPagesView.tsx)
  // ------------------------------------------------------------------------
  {
    path: "/about",
    title: "About Us — Dadu's Trusted Food Delivery | Dadu Food",
    description:
      "Learn how Dadu Food connects Dadu City households with trusted local restaurants and daily groceries from 12:00 PM to 11:00 PM.",
    canonical: `${ORIGIN}/about`,
    breadcrumb: "About Us — Dadu's Trusted Food Delivery",
    jsonLd: "standard",
    noscript: {
      h1: "Dadu City's Fastest Food & Grocery Delivery Platform",
      sections: [
        {
          h2: "About Dadu Food",
          p: "Dadu Food is Dadu city's own food, grocery and medicine delivery service. Order food online in Dadu from local restaurants and get it delivered hot to your home in 20 to 35 minutes. Delivery fee Rs 70 for food orders and Rs 100 for grocery orders. Payment by Cash on Delivery (COD) or Easypaisa only. Food delivery hours: 12:00 PM to 11:00 PM, seven days a week. Call or WhatsApp 03277004471. Address: Station Road, Dadu, Sindh 76200.",
        },
        {
          h2: "Our story",
          p: "Dadu Food was built for Dadu city, because ordering food, groceries and medicines online should not be something only big cities get. Dadu Food brings the city's own restaurants, grocery shelves and pharmacy essentials together on one website, with one rider, one delivery fee and live tracking from the kitchen to your door. Our grand opening is on Tuesday, 15 December 2026.",
        },
      ],
    },
  },
  {
    path: "/contact",
    title: "Contact Dadu Food Helpline (03277004471) | Dadu Food",
    description:
      "Reach Dadu Food support on Station Road, Dadu or call/WhatsApp 03277004471 daily between 12:00 PM and 11:00 PM.",
    canonical: `${ORIGIN}/contact`,
    breadcrumb: "Contact Dadu Food Helpline (03277004471)",
    jsonLd: "standard",
    noscript: {
      h1: "Contact Dadu Food",
      sections: [
        {
          h2: "Customer support — Dadu Food helpline",
          p: "Need help with an order, refund, or partnership? Our local Dadu support team is here daily. Call or WhatsApp the helpline at 03277004471 between 12:00 PM and 11:00 PM, or email support@dadufood.pk.",
        },
        {
          h2: "Office address",
          p: "Dadu Food, Station Road, Dadu, Sindh 76200, Pakistan. Food delivery runs from 12:00 PM to 11:00 PM every day; grocery and medicine orders can be placed from the morning.",
        },
      ],
    },
  },
  {
    path: "/partner-with-us",
    title: "Register Your Restaurant in Dadu | Dadu Food Partners",
    description:
      "Grow your Dadu restaurant, cafe, or grocery store with Dadu Food. Zero upfront setup fee and instant online orders.",
    canonical: `${ORIGIN}/partner-with-us`,
    breadcrumb: "Register Your Restaurant in Dadu",
    jsonLd: "standard",
    noscript: {
      h1: "Partner Your Restaurant With Dadu Food",
      sections: [
        {
          h2: "Commission — 10% per order",
          p: "Dadu Food charges a simple 10% commission on each order you receive through us — that is all. There is no upfront setup fee and no monthly fee to join. You keep 90% of every order value, and the delivery fee paid by the customer covers the rider.",
        },
        {
          h2: "How to join",
          p: "Fill in the application form with your restaurant or shop name, the owner or manager's name, your WhatsApp number and your shop address in Dadu. Our onboarding manager will call you within 24 hours to confirm your menu, prices and opening hours. Your kitchen usually goes live within a day or two of your call. You can also call or WhatsApp our helpline at 03277004471.",
        },
      ],
    },
  },
  {
    path: "/become-a-rider",
    title: "Become a Dadu Food Delivery Rider | Earn Daily in Dadu",
    description:
      "Join Dadu Food as a delivery rider in Dadu City. Flexible hours, daily earnings, and 100% of customer tips.",
    canonical: `${ORIGIN}/become-a-rider`,
    breadcrumb: "Become a Dadu Food Delivery Rider",
    jsonLd: "standard",
    noscript: {
      h1: "Become a Dadu Food Rider",
      sections: [
        {
          h2: "Earn daily delivering food and groceries in Dadu City",
          p: "Riders earn a payout for every order they deliver, with flexible shifts — morning, evening or full day — and 100% of customer tips go straight to you; Dadu Food takes nothing from your tips. There is no fee to apply.",
        },
        {
          h2: "What you need",
          p: "Your own vehicle — a motorbike (70cc or 125cc), an electric bike or a bicycle — in good working condition, a mobile phone for the rider panel, your CNIC available for verification, and good knowledge of Dadu city. Fill in the application form and our fleet supervisor in Dadu will contact you shortly. You can also call or WhatsApp our helpline at 03277004471.",
        },
      ],
    },
  },
  {
    path: "/terms",
    title: "Terms & Conditions | Dadu Food",
    description:
      "Read the Terms & Conditions for ordering food and groceries on Dadu Food in Dadu, Sindh.",
    canonical: `${ORIGIN}/terms`,
    breadcrumb: "Terms & Conditions",
    jsonLd: "standard",
    noscript: {
      h1: "Terms & Conditions",
      sections: [
        {
          h2: "Ordering, pricing & delivery fees",
          p: "Customers must provide an active Pakistani mobile number (verified via SMS OTP) and a reachable address in Dadu City. All menu prices are listed in Pakistani Rupees (PKR). Standard delivery is Rs. 50; orders below Rs. 500 incur Rs. 100 delivery fee; orders of Rs. 1,000 or more receive free delivery. Final totals are shown clearly before placing your order.",
        },
        {
          h2: "Cancellations, payments & hours",
          p: "You may cancel an order from your Order Tracker before the kitchen marks it as Preparing or Dispatched. We accept Cash on Delivery (COD) and Easypaisa. Dadu Food serves Dadu city, Sindh, and food delivery runs from 12:00 PM to 11:00 PM every day. Grocery and medicine orders can be placed from the morning.",
        },
      ],
    },
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy | Dadu Food",
    description:
      "How Dadu Food collects, uses, and protects your phone number, delivery addresses, and order history.",
    canonical: `${ORIGIN}/privacy-policy`,
    breadcrumb: "Privacy Policy",
    jsonLd: "standard",
    noscript: {
      h1: "Privacy Policy",
      sections: [
        {
          h2: "Data we collect — and how we use it",
          p: "We collect only the information needed to deliver your orders: your name, verified mobile phone number, optional email address, delivery addresses in Dadu, and order history. Browser GPS location is optional and used strictly to help pinpoint your delivery address.",
        },
        {
          h2: "Data sharing & your rights",
          p: "Your delivery address and phone number are shared only with the assigned restaurant and rider fulfilling your active order. We never sell customer contact numbers to third parties. To request account or data deletion, contact our helpline at 03277004471 or email support@dadufood.pk.",
        },
      ],
    },
  },
  {
    path: "/refund-policy",
    title: "Refund & Cancellation Policy | Dadu Food",
    description:
      "Clear order cancellation, missing-item refund, and Easypaisa refund timelines for Dadu Food customers.",
    canonical: `${ORIGIN}/refund-policy`,
    breadcrumb: "Refund & Cancellation Policy",
    jsonLd: "standard",
    noscript: {
      h1: "Refund & Cancellation Policy",
      sections: [
        {
          h2: "Instant cancellation & refunds",
          p: "Orders cancelled before kitchen preparation begins incur zero charges. Prepaid Easypaisa amounts are refunded within 24 hours. Approved refunds are credited via Easypaisa or Dadu Food Coins Wallet (your choice) within 24–48 business hours.",
        },
        {
          h2: "Missing, wrong, or damaged items",
          p: "If an item is missing, spilled, or incorrect upon delivery, report it within 30 minutes via WhatsApp at 03277004471 with your unique Order ID and a quick photo. We will arrange an immediate replacement or full item refund.",
        },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// JSON-LD builder. Mirrors syncPageSeo() in seoManager.ts:
//  - LocalBusiness/FoodEstablishment node on EVERY route.
//  - Home only: FAQPage (the 27 FAQs, also rendered visibly on the
//    homepage) + WebPage node.
//  - Shop pages only: Restaurant node with a price-free Menu (real dish
//    kinds, no aggregateRating — no real ratings).
//  - Non-home routes: BreadcrumbList (Home > current page).
// The <script> uses id="dadu-dynamic-jsonld" so that at runtime
// seoManager.setJsonLd() finds it by ID and UPDATES it in place — no
// duplicate JSON-LD block is ever created.
// ---------------------------------------------------------------------------
export function buildJsonLd(route) {
  const graph = [localBusinessNode()];

  if (route.jsonLd === "home") {
    // FAQPage — the same 27 FAQs rendered visibly on the homepage
    // (App.tsx FAQ section + the noscript in index.html).
    graph.push({
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
    graph.push({
      "@type": "WebPage",
      name: route.title,
      url: `${ORIGIN}/`,
      description: route.description,
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: [".speakable-summary", ".faq-answer"],
      },
    });
  }

  if (route.jsonLd === "shop" && route.shop) {
    const s = route.shop;
    graph.push({
      "@type": "Restaurant",
      "@id": `${route.canonical}#restaurant`,
      name: s.name,
      description: s.oneLineDescription,
      url: route.canonical,
      image: OG_IMAGE,
      telephone: PHONE_INTL,
      servesCuisine: s.servesCuisine,
      priceRange: "Rs. 80 – Rs. 2,500",
      openingHours: "Mo-Su 12:00-23:00",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Station Road",
        addressLocality: "Dadu",
        addressRegion: "Sindh",
        addressCountry: "PK",
      },
      hasMenu: {
        "@type": "Menu",
        name: `${s.name} Full Menu`,
        hasMenuSection: [
          {
            "@type": "MenuSection",
            name: "Menu Items",
            hasMenuItem: s.menuItems.slice(0, 8).map((name) => ({
              "@type": "MenuItem",
              name,
              description: `${name} from ${s.name} in Dadu`,
            })),
          },
        ],
      },
    });
  }

  if (route.breadcrumb) {
    graph.push(breadcrumbNode(route.breadcrumb, route.canonical));
  }

  return { "@context": "https://schema.org", "@graph": graph };
}
