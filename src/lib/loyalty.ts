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

/**
 * Credits redeemed coins and voucher discounts used by customer on an order directly to the assigned rider's account.
 * Rider can later receive this discount reimbursement / subsidy cash during admin settlement.
 */
export async function creditRiderCoinsForOrder(db: any, orderId: string) {
  try {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return;
    const order = orderSnap.data();

    const coinsUsed = Number(order.coinsUsed) || 0;
    const voucherDiscount = Number(order.voucher?.discountAmount) || 0;
    const totalSubsidy = coinsUsed + voucherDiscount;

    if (totalSubsidy <= 0) return;
    if (!order.riderId) return;

    // Prevent double crediting
    if (order.discountCreditedToRider || (coinsUsed > 0 && order.coinsCreditedToRider && voucherDiscount === 0)) {
      console.log("Discount subsidy already credited to rider for this order.");
      return;
    }

    // Update rider's user profile with credited subsidy and coins
    const riderRef = doc(db, "users", order.riderId);
    const riderUpdate: Record<string, any> = {
      totalDiscountSubsidyCollected: increment(totalSubsidy),
    };

    if (coinsUsed > 0) {
      riderUpdate.loyaltyCoins = increment(coinsUsed);
      riderUpdate.coinsCollected = increment(coinsUsed);
    }
    if (voucherDiscount > 0) {
      riderUpdate.voucherSubsidyCollected = increment(voucherDiscount);
    }

    await updateDoc(riderRef, riderUpdate);

    // Mark order as discount credited to rider
    await updateDoc(orderRef, {
      coinsCreditedToRider: true,
      discountCreditedToRider: true,
      discountSubsidyAmount: totalSubsidy,
    });

    // Send in-app notification to the rider
    let noteTitle = "🎟️ / 🪙 Discount Subsidy Added to Balance!";
    let noteMsg = "";
    if (voucherDiscount > 0 && coinsUsed > 0) {
      noteTitle = "🎟️ Voucher & 🪙 Coin Discount Added to Rider Balance!";
      noteMsg = `Customer ne order #${orderId.substring(0, 6)} par Voucher (Rs. ${voucherDiscount}) aur Coins (Rs. ${coinsUsed}) use kiye the. Kul Rs. ${totalSubsidy} aapke Discount Reimbursement wallet mein add ho gaye hain jo Admin aapko pay karega! 💵`;
    } else if (voucherDiscount > 0) {
      noteTitle = "🎟️ Voucher Discount Added to Rider Balance!";
      noteMsg = `Customer ne order #${orderId.substring(0, 6)} par Voucher Discount (Rs. ${voucherDiscount}) use kiya tha. Yeh Rs. ${voucherDiscount} aapke Discount Reimbursement balance mein add ho gaye hain jo Admin settlement par aapko pay karega! 💵`;
    } else {
      noteTitle = "🪙 Customer Coins Added to Rider Wallet!";
      noteMsg = `Customer ne order #${orderId.substring(0, 6)} par ${coinsUsed} Dadu Coins (Rs. ${coinsUsed} value) redeem kiye the, jo aapke rider account mein credit kar diye gaye hain! Admin settlement ke waqt iske paise le sakte hain. 💵`;
    }

    await addDoc(collection(db, "notifications"), {
      userId: order.riderId,
      title: noteTitle,
      message: noteMsg,
      createdAt: { seconds: Date.now() / 1000 },
      read: false,
    });

    console.log(`Successfully credited Rs. ${totalSubsidy} discount subsidy (Voucher: ${voucherDiscount}, Coins: ${coinsUsed}) to rider ${order.riderId} for order ${orderId}`);
  } catch (error) {
    console.error("Error in creditRiderCoinsForOrder:", error);
  }
}

export const creditRiderDiscountsForOrder = creditRiderCoinsForOrder;

