import React from "react";

// Directory landing pages (/restaurants and /hotels) for Dadu Food.
// REAL DATA ONLY — every restaurant, cuisine, description and dish keyword
// below was supplied by the owner. No invented restaurants, prices, ratings
// or hours. Delivery facts (20–35 min, Rs 50, COD & Easypaisa, 03277004471,
// 12:00 PM – 11:00 PM, Station Road, Dadu) are the site's real facts.

export interface DirectoryRestaurant {
  name: string;
  slug: string;
  cuisines: string[];
  description: string;
  dishKeywords: string[];
}

export const DIRECTORY_RESTAURANTS: DirectoryRestaurant[] = [
  {
    name: "Dadu Fast Food & Kitchen",
    slug: "dadu-fast-food-kitchen",
    cuisines: ["Fast Food", "Pizza", "Burgers", "Broast"],
    description:
      "Freshly baked pizzas, zinger burgers, crispy broast, and deals across Dadu.",
    dishKeywords: ["Zinger Burger", "Chicken Biryani", "Pizza", "Crispy Broast"],
  },
  {
    name: "S M Bilal Hotel",
    slug: "s-m-bilal-hotel",
    cuisines: ["Desi Food", "BBQ", "Karahi"],
    description:
      "Dadu BBQ, mutton karahi, seekh kababs, and fresh tandoori naan.",
    dishKeywords: [
      "Mutton Karahi",
      "Chicken Karahi",
      "Seekh Kabab",
      "Tandoori Naan",
      "BBQ",
    ],
  },
  {
    name: "Tasty Bites Dadu",
    slug: "tasty-bites-dadu",
    cuisines: ["Pizza", "Pasta", "Lasagna", "Sandwich"],
    description:
      "Creamy pastas, loaded lasagna, grilled sandwiches, and pizzas in Dadu.",
    dishKeywords: [
      "Pizza",
      "Creamy Pasta",
      "Loaded Lasagna",
      "Grilled Sandwich",
      "Chicken Shawarma",
    ],
  },
];

export interface DirectoryViewProps {
  kind: "restaurants" | "hotels";
  restaurants: DirectoryRestaurant[];
  /** Real dish counts computed in App.tsx from finalDishes, keyed by restaurant name. Omitted when unknown — never invented. */
  dishCounts?: Record<string, number>;
  onViewMenu: (restaurantName: string) => void;
  onGoHome: () => void;
  onGoToPartner: () => void;
}

const DirectoryView: React.FC<DirectoryViewProps> = ({
  kind,
  restaurants,
  dishCounts,
  onViewMenu,
  onGoHome,
  onGoToPartner,
}) => {
  const isHotels = kind === "hotels";
  const heading = isHotels ? "Hotels in Dadu" : "Restaurants in Dadu";
  const listLabel = isHotels ? "hotel" : "restaurant";

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-4 pt-3.5 space-y-4">
      {/* Intro — same card styling as the "About Dadu Food" / "We Deliver Across Dadu City" sections */}
      <section className="bg-white dark:bg-[#14141A] p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-3 border border-[#E6E6EE] dark:border-[#272733] shadow-xs">
        <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-[#111118] dark:text-[#F5F5F8]">
          {heading}
        </h1>
        {isHotels ? (
          <p className="text-xs sm:text-sm text-[#5A5A6B] dark:text-[#A3A3B5] leading-relaxed">
            Looking for hotels in Dadu? S M Bilal Hotel is listed on Dadu Food
            for BBQ, mutton karahi, seekh kababs and tandoori naan, delivered
            hot to your door in Dadu city in 20–35 minutes for a flat Rs 50
            delivery fee. Pay by Cash on Delivery or Easypaisa. Food is served
            from 12:00 PM to 11:00 PM every day from Station Road, Dadu.
          </p>
        ) : (
          <p className="text-xs sm:text-sm text-[#5A5A6B] dark:text-[#A3A3B5] leading-relaxed">
            The best restaurants in Dadu, in one place. Order food online from
            Dadu Fast Food &amp; Kitchen, S M Bilal Hotel and Tasty Bites Dadu —
            biryani, zinger burgers, pizza, karahi and BBQ delivered across
            Dadu city in 20–35 minutes for a flat Rs 50 delivery fee. Dadu mein
            khana order karein — pay by Cash on Delivery or Easypaisa, and
            track your order live until it arrives. Food delivery Dadu families
            trust, served from 12:00 PM to 11:00 PM every day from Station
            Road, Dadu.
          </p>
        )}
        {isHotels && (
          <p className="text-xs sm:text-sm text-[#5A5A6B] dark:text-[#A3A3B5] leading-relaxed">
            S M Bilal Hotel is the only hotel listed on Dadu Food so far. More
            hotels in Dadu joining soon —{" "}
            <a
              href="/partner-with-us"
              onClick={(e) => {
                e.preventDefault();
                onGoToPartner();
              }}
              className="text-[#D70F64] dark:text-[#FF4D94] font-bold hover:underline"
            >
              list your hotel
            </a>{" "}
            on Dadu Food.
          </p>
        )}
      </section>

      {/* Restaurant / hotel cards */}
      <section aria-label={`${heading} list`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {restaurants.map((restaurant) => {
            const dishCount = dishCounts?.[restaurant.name];
            return (
              <article
                key={restaurant.slug}
                className="bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs hover:shadow-md hover:border-[#D70F64]/40 transition-all flex flex-col"
              >
                <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1">
                  <div>
                    <h2 className="font-extrabold text-base sm:text-lg tracking-tight text-[#111118] dark:text-[#F5F5F8] leading-tight">
                      {restaurant.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#5A5A6B] dark:text-[#A3A3B5] leading-relaxed mt-1">
                      {restaurant.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {restaurant.cuisines.map((cuisine) => (
                      <span
                        key={cuisine}
                        className="rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-zinc-700 dark:text-zinc-200"
                      >
                        {cuisine}
                      </span>
                    ))}
                  </div>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#111118] dark:text-[#F5F5F8] mb-1.5">
                      Popular dishes
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {restaurant.dishKeywords.map((dish) => (
                        <span
                          key={dish}
                          className="rounded-full bg-[#D70F64]/10 dark:bg-[#D70F64]/15 border border-[#D70F64]/25 px-2.5 py-1 text-[11px] sm:text-xs font-bold text-[#D70F64] dark:text-[#FF4D94]"
                        >
                          {dish}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-[#5A5A6B] dark:text-[#A3A3B5] leading-relaxed">
                    Delivery in 20–35 min · Rs 50 delivery fee · Cash on
                    Delivery &amp; Easypaisa · 12:00 PM – 11:00 PM
                    {typeof dishCount === "number" && dishCount > 0
                      ? ` · ${dishCount} dishes on the menu`
                      : ""}
                  </p>
                  <a
                    href={`/shop/${restaurant.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onViewMenu(restaurant.name);
                    }}
                    className="mt-auto inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#D70F64] hover:bg-[#B80C54] text-white text-xs font-extrabold uppercase tracking-wider px-4 py-2.5 transition-colors cursor-pointer"
                  >
                    View menu
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* List your restaurant / hotel CTA */}
      <section className="bg-white dark:bg-[#14141A] p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-2 border border-[#E6E6EE] dark:border-[#272733] shadow-xs">
        <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-[#111118] dark:text-[#F5F5F8]">
          {isHotels
            ? "List your hotel on Dadu Food"
            : "List your restaurant on Dadu Food"}
        </h2>
        <p className="text-xs sm:text-sm text-[#5A5A6B] dark:text-[#A3A3B5] leading-relaxed">
          {isHotels
            ? "Run a hotel in Dadu? Join Dadu Food and take online food orders from customers across Dadu city — zero upfront setup fee."
            : "Run a restaurant in Dadu? Join Dadu Food and take online food orders from customers across Dadu city — zero upfront setup fee."}{" "}
          <a
            href="/partner-with-us"
            onClick={(e) => {
              e.preventDefault();
              onGoToPartner();
            }}
            className="text-[#D70F64] dark:text-[#FF4D94] font-bold hover:underline"
          >
            Register your {listLabel}
          </a>
          .
        </p>
      </section>

      {/* Delivery info */}
      <section className="bg-white dark:bg-[#14141A] p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-2 border border-[#E6E6EE] dark:border-[#272733] shadow-xs">
        <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-[#111118] dark:text-[#F5F5F8]">
          Delivery in Dadu
        </h2>
        <p className="text-xs sm:text-sm text-[#5A5A6B] dark:text-[#A3A3B5] leading-relaxed">
          Delivery takes 20–35 minutes across Dadu city for a flat Rs 50
          delivery fee. Pay by Cash on Delivery or Easypaisa. Food hours:
          12:00 PM – 11:00 PM every day. Address: Station Road, Dadu, Sindh
          76200. Call or WhatsApp us on{" "}
          <a
            href="https://wa.me/923277004471"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D70F64] dark:text-[#FF4D94] font-bold hover:underline"
          >
            03277004471
          </a>
          .
        </p>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onGoHome();
          }}
          className="inline-block text-xs sm:text-sm font-extrabold text-[#D70F64] dark:text-[#FF4D94] hover:underline"
        >
          ← Back to Dadu Food home
        </a>
      </section>
    </div>
  );
};

export default DirectoryView;
