import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import api from "../lib/api";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.total());
  const clearCart = useCartStore((state) => state.clear);

  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    zip_code: "",
    phone: user?.phone || "",
  });

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [loading, setLoading] = useState(false);

  const handleAddressChange = (field: string, value: string) => {
    setAddress({ ...address, [field]: value });
  };

  const placeOrder = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        user_id: user.id,
        total_price: total,
        payment_method: paymentMethod,
        address,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      };

      const response = await api.post("/api/orders", orderData);
      clearCart();
      
      if (paymentMethod === "razorpay") {
        window.location.href = `/payment/${response.data.order_id}`;
      } else {
        navigate(`/orders`);
      }
    } catch (err: any) {
      console.error("Order failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-section">
        <p className="panel-copy">Checkout</p>
        <h1 className="section-title">Finish strong</h1>
      </div>

      <div className="checkout-grid">
        <section className="checkout-card">
          <div className="stack">
            <div>
              <h2 className="panel-title">Delivery address</h2>
              <p className="form-help">Keep it crisp. One address, one fast drop.</p>
            </div>
            <input className="input" type="text" placeholder="Street" value={address.street} onChange={(e) => handleAddressChange("street", e.target.value)} />
            <input className="input" type="text" placeholder="City" value={address.city} onChange={(e) => handleAddressChange("city", e.target.value)} />
            <input className="input" type="text" placeholder="State" value={address.state} onChange={(e) => handleAddressChange("state", e.target.value)} />
            <input className="input" type="text" placeholder="ZIP code" value={address.zip_code} onChange={(e) => handleAddressChange("zip_code", e.target.value)} />
            <input className="input" type="tel" placeholder="Phone" value={address.phone} onChange={(e) => handleAddressChange("phone", e.target.value)} />
          </div>

          <div className="checkout-methods">
            <h2 className="panel-title">Payment method</h2>
            <label className="radio-card">
              <input type="radio" value="cod" checked={paymentMethod === "cod"} onChange={(e) => setPaymentMethod(e.target.value)} />
              <div>
                <strong>Cash on delivery</strong>
                <p className="muted small">Simple, familiar, zero friction.</p>
              </div>
            </label>
            <label className="radio-card">
              <input type="radio" value="razorpay" checked={paymentMethod === "razorpay"} onChange={(e) => setPaymentMethod(e.target.value)} />
              <div>
                <strong>Razorpay</strong>
                <p className="muted small">Premium online checkout.</p>
              </div>
            </label>
          </div>
        </section>

        <aside className="summary-card">
          <p className="panel-copy">Review</p>
          <h2 className="panel-title">Order summary</h2>
          <div className="stack">
            {items.map((item) => (
              <div key={item.id} className="summary-row">
                <span className="muted">{item.title} × {item.quantity}</span>
                <strong>₹{(item.price * item.quantity).toFixed(2)}</strong>
              </div>
            ))}
          </div>
          <div className="summary-row" style={{ paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <span className="muted">Total</span>
            <strong className="price" style={{ fontSize: "1.5rem" }}>₹{total.toFixed(2)}</strong>
          </div>
          <button onClick={placeOrder} disabled={loading} className="btn btn-primary" style={{ width: "100%", marginTop: 18 }}>
            {loading ? "Processing..." : "Place order"}
          </button>
        </aside>
      </div>
    </div>
  );
}
