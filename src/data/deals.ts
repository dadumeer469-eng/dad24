/**
 * Dadu Food — bundle / meal deals.
 *
 * Every dish below is a REAL menu item with its REAL menu price.
 * Prices verified against the live menu:
 *  - "Crispy Zinger Burger" Rs 349, "Chicken Biryani" Rs 400,
 *    "Chicken Shawarma" Rs 250, "Chicken Karahi" Rs 950
 *    (Dadu Food popular items, verified against the live site).
 *  - "Chicken Biryani Single Plate (with Raita & Salad)" Rs 380,
 *    "Beef Biryani Special Double Boti" Rs 480,
 *    "Special Dish" Rs 350,
 *    "Mega Zinger Feast Combo" Rs 890,
 *    "Family Karahi Platter Deal" Rs 1850
 *    (bestsellers shown on the live homepage "Today's Deals" carousel).
 *
 * No dish and no price is invented. Each deal is 10–20% off the sum of
 * its dishes, rounded to the nearest Rs 5.
 */

export interface DealDish {
  /** Exact menu dish name (as shown on the site). */
  name: string;
  /** Menu price in Rs (as shown on the site). */
  price: number;
  /** How many of this dish are in the bundle. Default 1. */
  qty?: number;
}

export type DealTag = "Family" | "Lunch" | "Dinner" | "Ramadan" | "Value";

export interface Deal {
  id: string;
  title: string;
  description: string;
  dishes: DealDish[];
  /** Sum of dish price x qty, in Rs. */
  originalTotal: number;
  /** Discounted bundle price, in Rs (10–20% off originalTotal). */
  dealPrice: number;
  tag: DealTag;
}

export const DEALS: Deal[] = [
  {
    id: "deal-zinger-shawarma-duo",
    title: "Zinger + Shawarma Lunch Duo",
    description:
      "A Crispy Zinger Burger with a Chicken Shawarma — the quick lunch Dadu loves, for less.",
    dishes: [
      { name: "Crispy Zinger Burger", price: 349 },
      { name: "Chicken Shawarma", price: 250 },
    ],
    originalTotal: 599,
    dealPrice: 510,
    tag: "Lunch",
  },
  {
    id: "deal-biryani-lovers-pair",
    title: "Biryani Lovers Pair",
    description:
      "Chicken Biryani plus the Beef Biryani Special Double Boti — two biryanis, one happy table.",
    dishes: [
      { name: "Chicken Biryani", price: 400 },
      { name: "Beef Biryani Special Double Boti", price: 480 },
    ],
    originalTotal: 880,
    dealPrice: 750,
    tag: "Lunch",
  },
  {
    id: "deal-family-karahi-feast",
    title: "Family Karahi Feast",
    description:
      "Chicken Karahi with Chicken Biryani and a Biryani Single Plate — a full family dinner in one order.",
    dishes: [
      { name: "Chicken Karahi", price: 950 },
      { name: "Chicken Biryani", price: 400 },
      { name: "Chicken Biryani Single Plate (with Raita & Salad)", price: 380 },
    ],
    originalTotal: 1730,
    dealPrice: 1470,
    tag: "Family",
  },
  {
    id: "deal-zinger-family-box",
    title: "Zinger Family Box",
    description:
      "The Mega Zinger Feast Combo with an extra Crispy Zinger Burger and a Chicken Shawarma — zinger night for the whole family.",
    dishes: [
      { name: "Mega Zinger Feast Combo", price: 890 },
      { name: "Crispy Zinger Burger", price: 349 },
      { name: "Chicken Shawarma", price: 250 },
    ],
    originalTotal: 1489,
    dealPrice: 1340,
    tag: "Family",
  },
  {
    id: "deal-shawarma-night-pack",
    title: "Shawarma Night Pack",
    description:
      "Two Chicken Shawarmas and a Special Dish — the easy evening share pack.",
    dishes: [
      { name: "Chicken Shawarma", price: 250, qty: 2 },
      { name: "Special Dish", price: 350 },
    ],
    originalTotal: 850,
    dealPrice: 680,
    tag: "Dinner",
  },
  {
    id: "deal-biryani-karahi-dinner",
    title: "Biryani + Karahi Dinner",
    description:
      "A Biryani Single Plate with Raita & Salad beside a Chicken Karahi — desi dinner, sorted.",
    dishes: [
      { name: "Chicken Biryani Single Plate (with Raita & Salad)", price: 380 },
      { name: "Chicken Karahi", price: 950 },
    ],
    originalTotal: 1330,
    dealPrice: 1170,
    tag: "Dinner",
  },
  {
    id: "deal-grand-family-platter",
    title: "Grand Family Platter",
    description:
      "The Family Karahi Platter Deal with a Beef Biryani Special Double Boti — the biggest table, the best value.",
    dishes: [
      { name: "Family Karahi Platter Deal", price: 1850 },
      { name: "Beef Biryani Special Double Boti", price: 480 },
    ],
    originalTotal: 2330,
    dealPrice: 2095,
    tag: "Family",
  },
  {
    id: "deal-ramadan-iftar-special",
    title: "Ramadan Iftar Special",
    description:
      "Chicken Biryani, Chicken Shawarma and a Special Dish — a complete iftar spread for the family.",
    dishes: [
      { name: "Chicken Biryani", price: 400 },
      { name: "Chicken Shawarma", price: 250 },
      { name: "Special Dish", price: 350 },
    ],
    originalTotal: 1000,
    dealPrice: 800,
    tag: "Ramadan",
  },
];

/** Rs saved by a deal (originalTotal - dealPrice). */
export function dealSavings(deal: Deal): number {
  return deal.originalTotal - deal.dealPrice;
}

/** Discount percentage of a deal, rounded to one decimal. */
export function dealDiscountPct(deal: Deal): number {
  return Math.round(((deal.originalTotal - deal.dealPrice) / deal.originalTotal) * 1000) / 10;
}
