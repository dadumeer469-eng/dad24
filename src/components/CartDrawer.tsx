import React, { useState } from "react";
import { UserProfile, OrderItem } from "../types";
import { X, ShoppingBag, MapPin, Phone, User, AlertTriangle, ShieldCheck, Heart, Edit2 } from "lucide-react";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: OrderItem[];
  onUpdateQuantity: (dishId: string, quantity: number) => void;
  onRemoveItem: (dishId: string) => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  deliveryFee: number; // Stored inside Firestore settings!
  onPlaceOrder: (details: { name: string; phone: string; address: string; paymentMethod: string; orderType: "food" | "service" }) => Promise<void>;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  currentUser,
  onOpenAuth,
  deliveryFee,
  onPlaceOrder,
}: CartDrawerProps) {
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const totalFoodItemsPrice = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  
  // Checking if there are only services or foods in the cart
  const hasFood = cartItems.some((item) => item.type === "food");
  const hasService = cartItems.some((item) => item.type === "service");

  // Determine delivery charge: Rs. 0 for pure diagnostic home services, custom delivery charge for food!
  const finalDeliveryFee = hasFood ? deliveryFee : 0;
  const grandTotal = totalFoodItemsPrice + finalDeliveryFee;

  // Handles auto checkout detail mapping
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    setSubmitting(true);

    let finalName = currentUser?.name || nameInput.trim();
    let finalPhone = currentUser?.phone || phoneInput.trim();
    let finalAddress = currentUser?.address || addressInput.trim();

    if (editingAddress && addressInput.trim()) {
      finalAddress = addressInput.trim();
    }

    if (!finalName || !finalPhone || !finalAddress) {
      alert("Please provide name, phone and delivery address to complete order!");
      setSubmitting(false);
      return;
    }

    // Determine type
    const orderTypeValue = hasService && !hasFood ? "service" : "food";
    const paymentMethodValue = orderTypeValue === "service" ? "Pay on Appointment" : "COD";

    try {
      await onPlaceOrder({
        name: finalName,
        phone: finalPhone,
        address: finalAddress,
        paymentMethod: paymentMethodValue,
        orderType: orderTypeValue,
      });
      setEditingAddress(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      {/* Tap space to slide out drawer */}
      <div className="flex-1" onClick={onClose}></div>

      <div className="w-full max-w-md bg-zinc-900 text-zinc-100 h-full flex flex-col shadow-2xl border-l border-zinc-800 animate-slide-in">
        
        {/* Banner with close */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#FF5C00]" />
            <h3 className="font-extrabold text-sm tracking-wide text-zinc-100 uppercase">Your Delivery Cart</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-850 rounded-full transition cursor-pointer text-zinc-400 hover:text-zinc-250"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of items inside the drawer */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950">
          
          {cartItems.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <span className="text-4xl block animate-bounce">🛒</span>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Your Dadu Cart is empty!</p>
              <button
                onClick={onClose}
                className="bg-[#FF5C00] hover:bg-[#d44d00] transition text-zinc-950 font-black text-xs uppercase tracking-wider py-3 px-6 rounded-xl cursor-pointer shadow-xs"
              >
                Go Add Tea & Food
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div key={item.dishId} className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-zinc-100 block truncate">{item.name}</span>
                      {item.type === "service" && (
                        <span className="bg-amber-950/40 border border-amber-900/40 text-amber-500 text-[9px] font-black uppercase px-2 py-0.5 rounded-sm shrink-0">
                          Service
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#FF5C00] font-black tracking-wider uppercase flex items-center gap-1 select-none mt-0.5">
                      <span>🏪</span> {item.restaurantName || (item.type === "service" ? "Dadu Home Services" : "Dadu Fast Food & Kitchen")}
                    </div>
                    <span className="text-xs text-zinc-400 font-bold block mt-0.5">Rs. {item.price} each</span>
                  </div>

                  {/* Quantity adjustments */}
                  <div className="flex items-center gap-2 select-none shrink-0 bg-zinc-950 border border-zinc-800 p-1 rounded-xl">
                    <button
                      onClick={() => onUpdateQuantity(item.dishId, item.quantity - 1)}
                      className="w-6 h-6 rounded-lg text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 font-extrabold flex items-center justify-center cursor-pointer hover:bg-zinc-800"
                    >
                      -
                    </button>
                    <span className="text-xs font-black min-w-4 text-center text-zinc-200">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.dishId, item.quantity + 1)}
                      className="w-6 h-6 rounded-lg text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 font-extrabold flex items-center justify-center cursor-pointer hover:bg-zinc-800"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.dishId)}
                    className="p-1 text-zinc-450 hover:text-[#FF5C00] shrink-0 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Checkout address inputs flow */}
          {cartItems.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-3xl mt-6 space-y-4 shadow-3xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300 border-b border-zinc-800 pb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#FF5C00]" />
                Delivery Information Details
              </h4>

              {/* Secure Loyalty Indicator */}
              {currentUser && currentUser.ordersCount > 0 && (
                <div className="bg-[#FF5C00]/10 border border-[#FF5C00]/20 text-[#FF5C00] text-[11px] p-2.5 rounded-2xl flex items-center gap-2 font-bold">
                  <Heart className="w-4 h-4 fill-[#FF5C00] text-[#FF5C00] shrink-0 animate-pulse" />
                  <span>
                    Thank you! You are a **Loyal Customer** with **{currentUser.ordersCount} previous orders!**
                  </span>
                </div>
              )}

              {/* If NOT logged in, let them sign in for easy ordering */}
              {!currentUser && (
                <div className="space-y-3">
                  <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl">
                    <p className="text-[11px] text-zinc-400 leading-snug font-semibold">
                      Already have an account? Login with your phone number for seamless automatic checkouts!
                    </p>
                    <button
                      type="button"
                      onClick={onOpenAuth}
                      className="w-full mt-2.5 bg-zinc-805 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 font-black py-2.5 text-xs rounded-xl transition cursor-pointer uppercase tracking-wider"
                    >
                      Sign In to Account
                    </button>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Recipient Name</label>
                      <input
                        type="text"
                        required
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="e.g. Ali Ahmed"
                        className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl outline-none text-zinc-200 font-bold focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Phone Number</label>
                      <input
                        type="text"
                        required
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="e.g. 03277004471"
                        className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl outline-none text-zinc-200 font-bold focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Complete Address</label>
                      <textarea
                        required
                        rows={2}
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                        placeholder="Street, Sector, City"
                        className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl outline-none text-zinc-200 font-bold focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00] resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* If Logged in: Single-Information Auto Memory Rule */}
              {currentUser && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-zinc-400 uppercase text-[10px] tracking-wider">Saved Profile info</span>
                    
                    {/* Change Address Toggle Button specifically for address editing flexibility */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddress(!editingAddress);
                        setAddressInput(currentUser.address);
                      }}
                      className="text-[11px] text-[#FF5C00] font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      change address
                    </button>
                  </div>

                  <div className="bg-zinc-955 border border-zinc-800 p-3.5 rounded-2xl space-y-2 text-xs shadow-3xs">
                    <div className="flex items-center gap-2 text-zinc-200 font-extrabold">
                      <User className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{currentUser.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-300 font-bold">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{currentUser.phone}</span>
                    </div>

                    {!editingAddress ? (
                      <div className="flex items-start gap-2 text-zinc-300 mt-1 sm:mt-0 font-bold leading-relaxed">
                        <MapPin className="w-3.5 h-3.5 text-[#FF5C00] shrink-0 mt-0.5" />
                        <span>{currentUser.address}</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                        <label className="text-[9px] font-black uppercase text-[#FF5C00] tracking-wider">Modify Current Address</label>
                        <textarea
                          rows={2}
                          value={addressInput}
                          onChange={(e) => setAddressInput(e.target.value)}
                          placeholder="Type new custom location info..."
                          className="w-full text-xs p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-150 font-bold outline-none focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00] resize-none"
                        />
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingAddress(false)}
                            className="bg-zinc-800 text-[10px] font-bold py-1 px-3 rounded-lg text-zinc-355 hover:text-zinc-100 border border-zinc-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingAddress(false)}
                            className="bg-[#FF5C00] text-[10px] font-bold py-1 px-3 rounded-lg text-zinc-950 cursor-pointer"
                          >
                            Save Temp
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Diagnostic Visitation Note for Pure Home Services ordered to omit Food terms */}
          {hasService && (
            <div className="bg-amber-950/20 border border-amber-900/40 text-amber-500 text-xs p-3.5 rounded-3xl mt-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <span className="font-extrabold block">⚠️ Visitation & Checkup Note:</span>
                <p className="text-[10.5px] text-zinc-400 mt-1 leading-relaxed font-semibold">
                  The Rs. 500 charge is purely the diagnostic/visitation fee (Aane ke charges). Complete material and secondary repair estimates will be evaluated and quoted on-site by the technician once they inspect the job at your home.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Pricing Summary Bottom Card */}
        {cartItems.length > 0 && (
          <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-3.5 rounded-t-3xl shadow-2xl shrink-0">
            <div className="space-y-1.5 text-xs text-zinc-400 font-semibold">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="text-zinc-100 font-extrabold font-mono">Rs. {totalFoodItemsPrice}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery / Service Fee:</span>
                <span className="text-zinc-100 font-extrabold">
                  {finalDeliveryFee === 0 ? (
                    <span className="text-emerald-500 font-black">FREE (Home Service Booking)</span>
                  ) : (
                    <span className="font-mono">Rs. {finalDeliveryFee}</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-zinc-100 text-sm font-black border-t border-zinc-805 pt-2.5">
                <span>Grand Total:</span>
                <span className="text-[#FF5C00] text-base font-bold font-mono">Rs. {grandTotal}</span>
              </div>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className="w-full bg-[#FF5C00] hover:bg-[#d44d00] text-zinc-950 py-3 rounded-2xl font-black uppercase text-xs tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              {submitting ? (
                <>Loading...</>
              ) : hasService && !hasFood ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Book Service (Pay on Visit)
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Place Order (Cash on Delivery)
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
