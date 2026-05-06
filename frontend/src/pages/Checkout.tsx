import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";
import api from "../lib/api";

export const Checkout = () => {
  const navigate = useNavigate();
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.total)();
  const clearCart = useCartStore((state) => state.clear);
  const user = useAuthStore((state) => state.user);

  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    zip_code: "",
    phone: "",
  });

  const handleSubmitAddress = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleSubmitOrder = async () => {
    if (!user) return;

    try {
      const response = await api.post("/api/orders/", {
        user_id: user.id,
        total_price: total,
        payment_method: paymentMethod,
        status: paymentMethod === "COD" ? "confirmed" : "pending_payment",
        address,
      });

      if (paymentMethod === "Razorpay") {
        window.location.href = `/payment/${response.data.order_id}`;
      } else {
        clearCart();
        navigate(`/order-success/${response.data.order_id}`);
      }
    } catch (err) {
      console.error("Order failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        {step === 1 && (
          <div className="bg-white rounded shadow p-6">
            <h2 className="text-xl font-bold mb-4">Delivery Address</h2>
            <form onSubmit={handleSubmitAddress} className="space-y-4">
              <input
                type="text"
                placeholder="Street"
                value={address.street}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
              />
              <input
                type="text"
                placeholder="City"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
              />
              <input
                type="text"
                placeholder="State"
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
              />
              <input
                type="text"
                placeholder="Zip Code"
                value={address.zip_code}
                onChange={(e) => setAddress({ ...address, zip_code: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                value={address.phone}
                onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
              />
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-bold">
                Continue
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded shadow p-6">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.title} x{item.quantity}</span>
                    <span>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-white rounded shadow p-6">
              <h2 className="text-xl font-bold mb-4">Payment Method</h2>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="COD"
                    checked={paymentMethod === "COD"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <span>Cash on Delivery</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="Razorpay"
                    checked={paymentMethod === "Razorpay"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <span>Razorpay (Credit/Debit Card)</span>
                </label>
              </div>
              <button
                onClick={handleSubmitOrder}
                className="w-full mt-6 bg-green-600 text-white py-3 rounded hover:bg-green-700 font-bold"
              >
                Place Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
