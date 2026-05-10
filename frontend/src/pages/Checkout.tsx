import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { useUser } from "@clerk/clerk-react";
import { useUserStore } from "../store/userStore";
import api from "../lib/api";
import { Navbar } from "../components/Navbar";
import { Check, Truck, DollarSign, CreditCard } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || "";

export const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.total)();
  const clearCart = useCartStore((state) => state.clear);
  const removeByProductIds = useCartStore((state) => state.removeByProductIds);
  const { profile, fetchAddress } = useUserStore();

  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<string>(
    user?.unsafeMetadata?.paymentMethod as string || "COD"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [missingIds, setMissingIds] = useState<number[]>([]);
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    zip_code: "",
    phone: "",
  });

  // Sync state with global store for real-time autofill
  useEffect(() => {
    if (profile?.address) {
      const addr = profile.address;
      setAddress({
        street: addr.street || "",
        city: addr.city || "",
        state: addr.state || "",
        zip_code: addr.zip_code || "",
        phone: addr.phone || profile.phone || "",
      });
    } else if (profile?.phone) {
      setAddress(prev => ({ ...prev, phone: profile.phone }));
    }
  }, [profile]);

  // Initial fetch if store is empty
  useEffect(() => {
    const uid = user?.id;
    if (uid && !profile?.address) {
      fetchAddress(uid);
    }
  }, [user?.id, profile?.address, fetchAddress]);

  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  const handleSubmitAddress = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleRazorpayPayment = (orderId: number) => {
    return new Promise<any>((resolve, reject) => {
      if (!RAZORPAY_KEY) {
        reject(new Error("VITE_RAZORPAY_KEY_ID is missing from environment. Please restart your dev server."));
        return;
      }
      const options = {
        key: RAZORPAY_KEY,
        amount: Math.round(total * 100),
        currency: "INR",
        name: "ABR Ecommerce",
        description: `Order #${orderId}`,
        handler: function (response: any) {
          resolve(response);
        },
        prefill: {
          name: user?.fullName || "",
          email: user?.primaryEmailAddress?.emailAddress || "",
          contact: address.phone,
        },
        theme: { color: "#6366f1" },
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled")),
        },
      };
      if (!window.Razorpay) {
        reject(new Error("Razorpay SDK not loaded. Please check your internet connection."));
        return;
      }
      const rzp = new window.Razorpay(options);
      rzp.open();
    });
  };

  const handleSubmitOrder = async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      if (paymentMethod === "Razorpay") {
        try {
          // 1. Open Razorpay first
          const rzpRes = await handleRazorpayPayment(Date.now());
          
          // 2. Payment success - Now create the order in DB
          const response = await api.post("/api/orders/create", {
            user_id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            name: user.fullName || user.firstName,
            total_price: total,
            payment_method: "Razorpay",
            razorpay_payment_id: rzpRes.razorpay_payment_id,
            status: "confirmed", // Since payment succeeded
            address,
            items: items.map(i => ({
              product_id: i.product_id || i.id,
              quantity: i.quantity,
              price: i.price
            }))
          });
          
          clearCart();
          navigate(`/order-success/${response.data.order_id}`);
        } catch (payErr: any) {
          console.error("Payment Step Error:", payErr);
          if (payErr.message === "Payment cancelled") {
            setError("Payment was cancelled. Order was not placed.");
          } else {
            setError(payErr.message || "Payment failed. Please try again.");
          }
        }
      } else {
        // COD - Create order immediately
        console.log("DEBUG: Placing COD order for user:", user.id);
        const response = await api.post("/api/orders/create", {
          user_id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          phone: user.primaryPhoneNumber?.phoneNumber,
          name: user.fullName || user.firstName,
          total_price: total,
          payment_method: "COD",
          status: "confirmed",
          address,
          items: items.map(i => ({
            product_id: i.product_id || i.id,
            quantity: i.quantity,
            price: i.price
          }))
        });
        console.log("DEBUG: Order placed successfully:", response.data);
        
        clearCart();
        navigate(`/order-success/${response.data.order_id}`);
      }
    } catch (err: any) {
      console.error("Order failed:", err);
      const data = err?.response?.data;
      if (data?.missing_ids) {
        setMissingIds(data.missing_ids);
        setError(`Some items (IDs: ${data.missing_ids.join(", ")}) are no longer available in our store.`);
      } else {
        setError(data?.detail || "Failed to place order. Please check your items and try again.");
      }
    }
    setLoading(false);
  };

  const handleAutoFixCart = () => {
    removeByProductIds(missingIds);
    setMissingIds([]);
    setError("");
  };

  if (items.length === 0) {
    return (
      <div>
        <Navbar />
        <div className="empty-state page-section">
          <div className="stack" style={{ placeItems: "center" }}>
            <p className="empty-title">Cart is empty</p>
            <p className="empty-copy">Add some items before checking out.</p>
            <button className="btn btn-primary" onClick={() => navigate("/")}>Browse Products</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />


      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, padding: "0 4px" }}>
        {["Delivery Address", "Payment"].map((label, i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center",
              fontWeight: 800, fontSize: "0.88rem",
              background: step > i ? "#10b981" : step === i + 1 ? "#6366f1" : "#e5e7eb",
              color: step >= i + 1 ? "#fff" : "#9ca3af"
            }}>{step > i + 1 ? <Check size={18} strokeWidth={3} /> : i + 1}</div>
            <span style={{ fontWeight: 600, color: step === i + 1 ? "#111827" : "#9ca3af", fontSize: "0.9rem" }}>{label}</span>
            {i < 1 && <div style={{ width: 40, height: 2, background: step > 1 ? "#6366f1" : "#e5e7eb", borderRadius: 1 }} />}
          </div>
        ))}
      </div>

      <section className="section-grid page-section">
        {step === 1 && (
          <div className="auth-card" style={{ gridColumn: "1 / -1", maxWidth: 640, margin: "0 auto" }}>
            <h2 className="auth-title">Delivery Address</h2>
            <form onSubmit={handleSubmitAddress} className="stack">
              <div className="field">
                <label className="label">Street Address</label>
                <input
                  type="text" placeholder="e.g. 123 MG Road" value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  className="input" required
                />
              </div>
              <div className="row-between" style={{ gap: 12 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label className="label">City</label>
                  <input type="text" placeholder="Mumbai" value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="input" required />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label className="label">State</label>
                  <input type="text" placeholder="Maharashtra" value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className="input" required />
                </div>
              </div>
              <div className="row-between" style={{ gap: 12 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label className="label">Zip Code</label>
                  <input type="text" placeholder="400001" value={address.zip_code}
                    onChange={(e) => setAddress({ ...address, zip_code: e.target.value })}
                    className="input" required />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label className="label">Phone Number</label>
                  <input type="tel" placeholder="9876543210" value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    className="input" required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }}>
                Continue to Payment →
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <>
            {/* Order Summary */}
            <div className="summary-card">
              <h2 className="panel-title">Order Summary</h2>
              <div className="stack" style={{ marginTop: 16 }}>
                {items.map((item) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 12, overflow: "hidden",
                      background: "#f1f5f9", flexShrink: 0
                    }}>
                      <img src={item.image_url} alt={item.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.title)}&size=100&background=e0e7ff&color=6366f1`; }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "#111827" }}>{item.title}</div>
                      <div style={{ color: "#6b7280", fontSize: "0.82rem" }}>Qty: {item.quantity}</div>
                    </div>
                    <span style={{ fontWeight: 700, color: "#111827" }}>₹{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="summary-row" style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
                <span style={{ fontWeight: 700, color: "#111827" }}>Total ({cartCount} items)</span>
                <span className="price" style={{ color: "#6366f1" }}>₹{total.toFixed(2)}</span>
              </div>
              <div style={{ marginTop: 12, padding: "12px 14px", background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0" }}>
                <span style={{ fontSize: "0.84rem", color: "#15803d", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                   <Truck size={18} />
                   Free delivery on this order
                </span>
              </div>
            </div>

            {/* Payment */}
            <div className="checkout-card">
              <h2 className="panel-title">Payment Method</h2>
              <div className="stack" style={{ marginTop: 20 }}>
                {[
                  { value: "COD", label: "Cash on Delivery", symbol: <DollarSign size={20} />, desc: "Pay when your order arrives" },
                  { value: "Razorpay", label: "Online Payment", symbol: <CreditCard size={20} />, desc: "Cards, UPI, Net Banking & more" },
                ].map(opt => (
                  <label
                    key={opt.value}
                    onClick={() => setPaymentMethod(opt.value)}
                    style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "16px 20px", borderRadius: 16, cursor: "pointer",
                      border: `2px solid ${paymentMethod === opt.value ? "#6366f1" : "#e5e7eb"}`,
                      background: paymentMethod === opt.value ? "#ede9fe" : "#fafafa",
                      transition: "all 160ms ease"
                    }}
                  >
                    <span style={{ color: paymentMethod === opt.value ? "#6366f1" : "#64748b" }}>{opt.symbol}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "#111827" }}>{opt.label}</div>
                      <div style={{ fontSize: "0.82rem", color: "#6b7280" }}>{opt.desc}</div>
                    </div>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      border: `2px solid ${paymentMethod === opt.value ? "#6366f1" : "#d1d5db"}`,
                      background: paymentMethod === opt.value ? "#6366f1" : "transparent",
                      display: "grid", placeItems: "center"
                    }}>
                      {paymentMethod === opt.value && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                    </div>
                  </label>
                ))}
              </div>

              {error && (
                <div style={{ marginTop: 16, padding: "20px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 16, color: "#dc2626", fontSize: "0.9rem" }}>
                  <div style={{ fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    Payment failed. Please try again.
                  </div>
                  <div style={{ opacity: 0.8, lineHeight: 1.5 }}>{error}</div>
                  {missingIds.length > 0 && (
                    <button 
                      onClick={handleAutoFixCart}
                      style={{ marginTop: 16, width: "100%", background: "#dc2626", color: "#fff", border: "none", padding: "12px", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      Auto-Fix Cart (Remove Missing Items)
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={handleSubmitOrder}
                disabled={loading}
                className="btn btn-primary"
                style={{ 
                  width: "100%", marginTop: 24, fontSize: "1.05rem", padding: "16px", 
                  opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  fontWeight: 600, borderRadius: 16
                }}
              >
                {loading ? "Processing…" : paymentMethod === "COD" ? (
                  <><Check size={20} /> Place Order</>
                ) : (
                  <><CreditCard size={20} /> Pay ₹{total.toFixed(0)} Now</>
                )}
              </button>

              <button
                className="btn btn-ghost"
                style={{ width: "100%", marginTop: 10 }}
                onClick={() => setStep(1)}
              >
                ← Change Address
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
};
