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
    <div>
      <div className="page-section">
        <p className="panel-copy">Orders</p>
        <h1 className="section-title">My orders</h1>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="stack" style={{ placeItems: "center" }}>
            <p className="empty-title">No orders yet</p>
            <p className="empty-copy">Your first great checkout will show up here.</p>
          </div>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <article key={order.id} className="order-card">
              <div className="row-between" style={{ alignItems: "start" }}>
                <div className="stack">
                  <h3 className="order-title">Order #{order.id}</h3>
                  <p className="muted small">{new Date(order.created_at).toLocaleDateString()}</p>
                  <span className="badge new">{order.payment_method.toUpperCase()}</span>
                </div>
                <div className="stack" style={{ alignItems: "end" }}>
                  <strong className="price">₹{order.total_price.toFixed(2)}</strong>
                  <span className={`status-badge ${order.status === "delivered" ? "status-delivered" : order.status === "cancelled" ? "status-cancelled" : order.status === "shipped" ? "status-shipped" : "status-pending"}`}>
                    {order.status}
                  </span>
                </div>
              </div>
              <div className="card-actions">
                <button onClick={() => setSelectedOrder({ order, items: [] })} className="btn btn-ghost">View details</button>
                {canCancel(order.status) && <button onClick={() => cancelOrder(order.id)} className="btn btn-danger">Cancel order</button>}
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedOrder && (
        <section className="detail-card page-section">
          <h2 className="panel-title">Order details · #{selectedOrder.order.id}</h2>
          <div className="stack">
            <p className="muted">Status: {selectedOrder.order.status}</p>
            <p className="muted">Total: ₹{selectedOrder.order.total_price.toFixed(2)}</p>
          </div>
        </section>
      )}
    </div>
  );
}
