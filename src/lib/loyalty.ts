import { doc, getDoc, updateDoc, increment, addDoc, collection } from "firebase/firestore";

/**
 * Automatically calculates and awards loyalty coins to a user upon successful delivery.
 * Safeguarded against double-awarding via `coinsEarnedAwarded` flag.
 */
export async function awardLoyaltyCoinsForOrder(db: any, orderId: string) {
  try {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return;
    const order = orderSnap.data();

    // Prevent double awarding coins
    if (order.coinsEarnedAwarded) {
      console.log("Coins already awarded for this order.");
      return;
    }

    // Get loyalty settings from Firestore settings document
    const settingsSnap = await getDoc(doc(db, "settings", "delivery_config"));
    const settings = settingsSnap.exists() ? settingsSnap.data() : {};

    const loyaltyEnabled = settings.loyaltyEnabled !== false;
    if (!loyaltyEnabled) {
      console.log("Loyalty wallet system is disabled.");
      return;
    }

    const minOrder = settings.loyaltyMinOrderForEarn ?? 100;
    const orderTotal = order.totalPrice || 0;

    if (orderTotal < minOrder) {
      console.log(`Order total Rs. ${orderTotal} is below min required Rs. ${minOrder} to earn coins.`);
      return;
    }

    const earnType = settings.loyaltyEarnType ?? "fixed";
    const earnCoinsVal = settings.loyaltyEarnCoins ?? 15;

    let earnedCoins = 0;
    if (earnType === "fixed") {
      earnedCoins = Math.floor(earnCoinsVal);
    } else {
      earnedCoins = Math.floor(orderTotal * (earnCoinsVal / 100));
    }

    if (earnedCoins <= 0) return;

    // Award coins to user's profile
    const userRef = doc(db, "users", order.userId);
    await updateDoc(userRef, {
      loyaltyCoins: increment(earnedCoins)
    });

    // Mark order as completed for coin calculations
    await updateDoc(orderRef, {
      coinsEarned: earnedCoins,
      coinsEarnedAwarded: true
    });

    // Send a real-time push/in-app notification to the user
    await addDoc(collection(db, "notifications"), {
      userId: order.userId,
      title: "Loyalty Cashback Earned! 🪙",
      message: `Mubarak ho! Aapne is order pe ${earnedCoins} Dadu Coins reward earn kiya hai! Keep ordering! 🎉`,
      createdAt: { seconds: Date.now() / 1000 },
      read: false
    });

    console.log(`Successfully awarded ${earnedCoins} coins to user ${order.userId} for order ${orderId}`);
  } catch (error) {
    console.error("Error in awardLoyaltyCoinsForOrder:", error);
  }
}
