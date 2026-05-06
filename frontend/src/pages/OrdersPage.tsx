import { useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

interface Order {
  id: number;
  total_price: number;
  status: string;
  created_at: string;
  payment_method: string;
}

interface OrderDetail {
  order: Order;
  items: any[];
}

export default function OrdersPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchOrders = async () => {
      try {
        const response = await api.get(`/api/orders/${user.id}`);
        setOrders(response.data);
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, navigate]);

  const cancelOrder = async (orderId: number) => {
    try {
      await api.put(`/api/orders/${orderId}/cancel`);
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: "cancelled" } : o));
      alert("Order cancelled successfully");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to cancel order");
    }
  };

  const canCancel = (status: string) => ["pending_payment", "confirmed", "processing"].includes(status);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <p className="text-gray-600">No orders yet</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold">Order #{order.id}</p>
                  <p className="text-gray-600 text-sm">{new Date(order.created_at).toLocaleDateString()}</p>
                  <p className="text-sm mt-1">Method: {order.payment_method.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">₹{order.total_price.toFixed(2)}</p>
                  <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                    order.status === "delivered" ? "bg-green-500 text-white" :
                    order.status === "cancelled" ? "bg-red-500 text-white" :
                    order.status === "shipped" ? "bg-blue-500 text-white" :
                    "bg-yellow-500 text-white"
                  }`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setSelectedOrder({ order, items: [] })}
                  className="text-blue-600 hover:underline"
                >
                  View Details
                </button>
                {canCancel(order.status) && (
                  <button
                    onClick={() => cancelOrder(order.id)}
                    className="text-red-600 hover:underline"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedOrder && (
        <div className="mt-8 border-t pt-8">
          <h2 className="text-2xl font-bold mb-4">Order Details - #{selectedOrder.order.id}</h2>
          <p>Status: {selectedOrder.order.status}</p>
          <p>Total: ₹{selectedOrder.order.total_price.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
