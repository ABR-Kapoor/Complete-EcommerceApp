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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold mb-4">Delivery Address</h2>
          <input
            type="text"
            placeholder="Street"
            value={address.street}
            onChange={(e) => handleAddressChange("street", e.target.value)}
            className="w-full px-4 py-2 border rounded-lg mb-3"
          />
          <input
            type="text"
            placeholder="City"
            value={address.city}
            onChange={(e) => handleAddressChange("city", e.target.value)}
            className="w-full px-4 py-2 border rounded-lg mb-3"
          />
          <input
            type="text"
            placeholder="State"
            value={address.state}
            onChange={(e) => handleAddressChange("state", e.target.value)}
            className="w-full px-4 py-2 border rounded-lg mb-3"
          />
          <input
            type="text"
            placeholder="ZIP Code"
            value={address.zip_code}
            onChange={(e) => handleAddressChange("zip_code", e.target.value)}
            className="w-full px-4 py-2 border rounded-lg mb-3"
          />
          <input
            type="tel"
            placeholder="Phone"
            value={address.phone}
            onChange={(e) => handleAddressChange("phone", e.target.value)}
            className="w-full px-4 py-2 border rounded-lg mb-4"
          />

          <h2 className="text-xl font-bold mb-4">Payment Method</h2>
          <label className="flex items-center gap-3 mb-3 cursor-pointer">
            <input
              type="radio"
              value="cod"
              checked={paymentMethod === "cod"}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            <span>Cash on Delivery</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              value="razorpay"
              checked={paymentMethod === "razorpay"}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            <span>Online Payment (Razorpay)</span>
          </label>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg h-fit">
          <h3 className="text-lg font-bold mb-4">Order Summary</h3>
          <div className="space-y-3 mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.title} x{item.quantity}</span>
                <span>₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 mb-6">
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={placeOrder}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
