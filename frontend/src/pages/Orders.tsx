import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

interface Order {
  id: number;
  total_price: number;
  status: string;
  payment_method: string;
  created_at: string;
}

export const Orders = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    api.get(`/api/orders/${user.id}`).then((res) => {
      setOrders(res.data);
      setLoading(false);
    });
  }, [user, navigate]);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">My Orders</h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded shadow p-8 text-center">
            <p className="text-gray-600">No orders yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">Order #{order.id}</h3>
                    <p className="text-gray-600 text-sm">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold">₹{order.total_price}</span>
                    <div className="text-sm">
                      <span
                        className={`inline-block px-3 py-1 rounded text-white mt-2 ${
                          order.status === "delivered"
                            ? "bg-green-500"
                            : order.status === "cancelled"
                            ? "bg-red-500"
                            : "bg-yellow-500"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">Payment: {order.payment_method}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/order/${order.id}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    View Details
                  </button>
                  {["pending_payment", "confirmed", "processing"].includes(order.status) && (
                    <button
                      onClick={() => {
                        api.put(`/api/orders/${order.id}/cancel`);
                        window.location.reload();
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
