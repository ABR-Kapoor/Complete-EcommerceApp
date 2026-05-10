import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../store/userStore";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";
import { Navbar } from "../components/Navbar";
import { 
  CreditCard, 
  CheckCircle2, 
  Truck, 
  PackageCheck, 
  RefreshCw, 
  XCircle, 
  RotateCcw,
  Package,
  Calendar,
  MapPin,
  ChevronRight
} from "lucide-react";

/* ── Status config ──────────────────────────────────────────── */
const STATUS_STEPS = [
  { key: "pending_payment", label: "Payment", icon: CreditCard },
  { key: "confirmed",       label: "Confirmed",   icon: CheckCircle2 },
  { key: "processing",      label: "Preparing",   icon: Package },
  { key: "shipped",         label: "Shipped",     icon: Truck },
  { key: "delivered",       label: "Delivered",   icon: PackageCheck },
];

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "#f59e0b",
  confirmed:       "#6366f1",
  processing:      "#06b6d4",
  shipped:         "#8b5cf6",
  delivered:       "#10b981",
  cancelled:       "#ef4444",
  refunded:        "#f97316",
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Payment Pending",
  confirmed:       "Order Confirmed",
  processing:      "Being Prepared",
  shipped:         "Out for Delivery",
  delivered:       "Delivered",
  cancelled:       "Cancelled",
  refunded:        "Refunded",
};

interface Order {
  id: number;
  total_price: number;
  status: string;
  payment_method: string;
  created_at: string;
  order_items?: any[];
  address?: any;
}

/* ── Status Timeline ────────────────────────────────────────── */
const StatusTimeline = ({ status }: { status: string }) => {
  const isCancelled = status === "cancelled" || status === "refunded";
  const activeIdx = STATUS_STEPS.findIndex(s => s.key === status);

  if (isCancelled) {
    const Icon = status === "refunded" ? RotateCcw : XCircle;
    return (
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 16, 
        padding: "16px 20px", 
        background: "#fef2f2", 
        borderRadius: "20px", 
        marginBottom: 24,
        border: "1px solid #fee2e2"
      }}>
        <Icon size={24} color="#ef4444" />
        <div>
          <div style={{ fontWeight: 800, color: "#ef4444", fontSize: "1rem" }}>
            {status === "refunded" ? "Order Refunded" : "Order Cancelled"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 2 }}>This order is no longer active</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24, padding: "0 4px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0, width: "100%" }}>
        {STATUS_STEPS.map((step, idx) => {
          const done = idx <= activeIdx;
          const active = idx === activeIdx;
          const isLast = idx === STATUS_STEPS.length - 1;
          const Icon = step.icon;
          
          return (
            <div key={step.key} style={{ display: "flex", alignItems: "flex-start", flex: isLast ? "0 0 auto" : 1 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative", zIndex: 2 }}>
                <div style={{
                  width: 44, 
                  height: 44, 
                  borderRadius: "14px", 
                  display: "grid", 
                  placeItems: "center",
                  background: active ? "linear-gradient(135deg, #6366f1, #06b6d4)" : (done ? "#f0fdf4" : "#fff"),
                  color: active ? "#fff" : (done ? "#10b981" : "#cbd5e1"),
                  border: active ? "none" : `2px solid ${done ? "#10b981" : "#f1f5f9"}`,
                  boxShadow: active ? "0 8px 20px rgba(99, 102, 241, 0.25)" : "none",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}>
                  {done && !active ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                </div>
                <span style={{
                  fontSize: "0.68rem", 
                  fontWeight: active ? 800 : 600,
                  color: active ? "#1e293b" : (done ? "#10b981" : "#94a3b8"),
                  textAlign: "center", 
                  whiteSpace: "nowrap",
                  letterSpacing: "0.01em"
                }}>
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div style={{
                  flex: 1, 
                  height: 4, 
                  marginTop: 20, 
                  background: idx < activeIdx ? "#10b981" : "#f1f5f9",
                  borderRadius: "2px",
                  marginRight: -10,
                  marginLeft: -10,
                  position: "relative",
                  zIndex: 1
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── Main Component ─────────────────────────────────────────── */
export const Orders = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const navigate = useNavigate();
  const syncProfile = useUserStore((state) => state.syncProfile);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      syncProfile({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName || user.firstName || user.username || "Verified User",
        avatar_url: user.imageUrl,
        phone: user.primaryPhoneNumber?.phoneNumber
      });
    }
  }, [isLoaded, isSignedIn, user, syncProfile]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    const uid = user?.id;
    if (!uid) return;
    try {
      const email = user.primaryEmailAddress?.emailAddress;
      const res = await api.get(`/api/orders/user/${uid}${email ? `?email=${email}` : ""}`);
      setOrders(res.data || []);
    } catch (e) {
      console.error("Fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    if (isLoaded && !isSignedIn) { navigate("/login"); return; }
    if (isLoaded && user) {
        fetchOrders();
    }
  }, [user, isLoaded, isSignedIn, navigate, fetchOrders]); // Removed profile dependency

  // Real-time updates via Supabase Subscriptions
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    
    const channel = supabase
      .channel(`orders_user_${uid}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders',
        filter: `user_id=eq.${uid}` 
      }, () => {
        fetchOrders();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchOrders]);

  // Fallback polling (faster: 5s)
  useEffect(() => {
    const id = setInterval(() => { if (user) fetchOrders(); }, 5000);
    return () => clearInterval(id);
  }, [user, fetchOrders]);

  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  const filteredOrders = orders
    .filter(o => filter === "all" || (o.status || "").toLowerCase() === filter.toLowerCase())
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sort === "newest" ? dateB - dateA : dateA - dateB;
    });

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    try {
      await api.put(`/api/orders/${orderId}/cancel`);
      fetchOrders();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to cancel order");
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar />
      <div className="empty-state page-section" style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <div className="stack" style={{ alignItems: "center", gap: 20 }}>
          <RefreshCw size={48} className="spin" color="#6366f1" />
          <p className="empty-title" style={{ fontWeight: 800 }}>Syncing your orders...</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ 
      fontFamily: "Inter, sans-serif", 
      minHeight: "100vh" 
    }}>
      <Navbar />

      <section className="page-section" style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }}>
        <div className="row-between" style={{ marginBottom: 40, alignItems: "flex-end" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6366f1", marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1" }} />
              <span style={{ fontWeight: 800, fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Purchase History</span>
            </div>
            <h1 style={{ fontSize: "2.8rem", fontWeight: 900, color: "#111827", letterSpacing: "-0.02em" }}>My Orders</h1>
          </div>
          
          <div className="stack" style={{ gap: 12, alignItems: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", background: "#f1f5f9", padding: 4, borderRadius: 12 }}>
               {["all", "pending", "confirmed", "shipped", "delivered"].map(s => (
                 <button 
                  key={s}
                  onClick={() => setFilter(s)}
                  style={{
                    padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                    fontSize: "0.82rem", fontWeight: 700, textTransform: "capitalize",
                    background: filter === s ? "#fff" : "transparent",
                    color: filter === s ? "#111827" : "#64748b",
                    boxShadow: filter === s ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
                    transition: "all 0.2s ease"
                  }}
                 >{s}</button>
               ))}
            </div>
            <div className="row-between" style={{ gap: 12 }}>
              <select 
                value={sort} 
                onChange={(e) => setSort(e.target.value)}
                style={{
                  padding: "10px 16px", borderRadius: 12, border: "1px solid #e2e8f0",
                  background: "#fff", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <button 
                onClick={fetchOrders}
                className="btn btn-ghost"
                style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, borderRadius: 12 }}
              >
                <RefreshCw size={18} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="empty-state" style={{ 
            background: "#fff", 
            borderRadius: "32px", 
            padding: "80px 40px", 
            boxShadow: "0 20px 50px rgba(0,0,0,0.04)",
            textAlign: "center"
          }}>
            <div className="stack" style={{ placeItems: "center", gap: 24 }}>
              <div style={{ 
                width: 100, 
                height: 100, 
                borderRadius: "50%", 
                background: "#f8fafc", 
                display: "grid", 
                placeItems: "center",
                color: "#6366f1"
              }}>
                <Package size={48} strokeWidth={1.5} />
              </div>
              <div>
                <p className="empty-title" style={{ fontSize: "1.75rem", fontWeight: 900, marginBottom: 8 }}>{filter === "all" ? "No orders yet" : `No ${filter} orders`}</p>
                <p className="empty-copy" style={{ color: "#64748b", maxWidth: 400 }}>{filter === "all" ? "Your history is clear. Ready to find something amazing to fill this space?" : `You don't have any orders with status "${filter}" yet.`}</p>
              </div>
              <div className="stack" style={{ gap: 12 }}>
                <button onClick={() => navigate("/")} className="btn btn-primary" style={{ padding: "16px 40px", borderRadius: "18px", fontWeight: 800, fontSize: "1.1rem" }}>Start Shopping</button>
                <button 
                  onClick={async () => {
                  if (!user) return;
                  setLoading(true);
                  try {
                    const email = user.primaryEmailAddress?.emailAddress;
                    const res = await api.post("/api/orders/repair", { user_id: user.id, email });
                    if (res.data.count > 0) {
                      alert(`Found and linked ${res.data.count} orders!`);
                      fetchOrders();
                    } else {
                      alert("No orphaned orders found.");
                    }
                  } catch (e) {
                    alert("Repair failed.");
                  } finally {
                    setLoading(false);
                  }
                }}
                  className="btn-ghost" 
                  style={{ fontSize: "0.85rem", color: "#6366f1", fontWeight: 700, padding: "12px", borderRadius: "14px", border: "1px solid #6366f120", cursor: "pointer" }}
                >
                  Missing an order? Repair History
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="stack" style={{ gap: 32 }}>
            {filteredOrders.map((order) => (
              <div key={order.id} className="order-card" style={{
                background: "#fff", 
                borderRadius: "24px", 
                padding: "0",
                boxShadow: "0 10px 40px rgba(0,0,0,0.03)", 
                border: "1px solid #f1f5f9",
                overflow: "hidden",
                transition: "transform 0.2s ease"
              }}>
                {/* Order Header */}
                <div style={{ 
                  padding: "24px 32px", 
                  background: "#fcfdfe", 
                  borderBottom: "1px solid #f1f5f9",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div style={{ display: "flex", gap: 32 }}>
                    <div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Order Placed</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>
                        <Calendar size={14} color="#6366f1" />
                        {new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Total Amount</div>
                      <div style={{ fontWeight: 900, color: "#6366f1", fontSize: "1.1rem" }}>₹{order.total_price.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Order ID</div>
                      <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>#PROD-{order.id.toString().padStart(5, '0')}</div>
                    </div>
                  </div>
                  
                  <div style={{ 
                    padding: "8px 20px", 
                    borderRadius: "12px", 
                    fontSize: "0.72rem", 
                    fontWeight: 800,
                    background: STATUS_COLORS[order.status] + "12", 
                    color: STATUS_COLORS[order.status],
                    textTransform: "uppercase", 
                    letterSpacing: "0.06em",
                    border: `1px solid ${STATUS_COLORS[order.status]}20`,
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLORS[order.status] }} />
                    {STATUS_LABELS[order.status] || order.status.replace(/_/g, " ")}
                  </div>
                </div>

                <div style={{ padding: "32px" }}>
                  {/* Status Timeline */}
                  <StatusTimeline status={order.status} />

                  {/* Product Grid */}
                  <div style={{ 
                    marginTop: 32, 
                    display: "flex", 
                    gap: 16, 
                    overflowX: "auto", 
                    paddingBottom: 12,
                    scrollbarWidth: "none" 
                  }}>
                    {order.order_items?.map((item: any, idx: number) => (
                      <div 
                        key={idx} 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 16, 
                          background: "#f8fafc", 
                          padding: "12px", 
                          borderRadius: "18px", 
                          minWidth: "240px",
                          border: "1px solid #f1f5f9"
                        }}
                      >
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <img
                            src={item.products?.image_url}
                            alt={item.products?.title}
                            style={{ width: 64, height: 64, borderRadius: "12px", objectFit: "cover", background: "#fff" }}
                            onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=P&background=f1f5f9&color=6366f1`; }}
                          />
                          {item.quantity > 1 && (
                            <span style={{ 
                              position: "absolute", 
                              top: -6, 
                              right: -6, 
                              background: "#1e293b", 
                              color: "#fff", 
                              fontSize: "0.65rem", 
                              fontWeight: 800, 
                              width: 20,
                              height: 20,
                              display: "grid",
                              placeItems: "center",
                              borderRadius: "50%",
                              border: "2px solid #fff"
                            }}>
                              {item.quantity}
                            </span>
                          )}
                        </div>
                        <div style={{ overflow: "hidden" }}>
                          <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.products?.title}</div>
                          <div style={{ color: "#6366f1", fontWeight: 800, fontSize: "0.9rem", marginTop: 2 }}>₹{item.price.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer Actions */}
                  <div style={{ 
                    marginTop: 32, 
                    paddingTop: 24, 
                    borderTop: "1px solid #f1f5f9", 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center" 
                  }}>
                    <div style={{ display: "flex", gap: 32 }}>
                      {order.address && (
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <div style={{ width: 36, height: 36, borderRadius: "10px", background: "#f1f5f9", display: "grid", placeItems: "center", color: "#64748b" }}>
                            <MapPin size={18} />
                          </div>
                          <div>
                            <p style={{ margin: "0 0 4px", fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>Shipping To</p>
                            <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#475569" }}>
                              {order.address.city}, {order.address.state}
                            </p>
                          </div>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "10px", background: "#f1f5f9", display: "grid", placeItems: "center", color: "#64748b" }}>
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>Payment</p>
                          <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#475569" }}>
                            {order.payment_method}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 12 }}>
                      <button 
                        onClick={() => navigate(`/product/${order.order_items?.[0]?.product_id}`)}
                        className="btn-ghost" 
                        style={{ 
                          padding: "12px 24px", 
                          borderRadius: "14px", 
                          fontWeight: 700, 
                          fontSize: "0.85rem",
                          color: "#64748b",
                          border: "1px solid #f1f5f9",
                          background: "transparent",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 8
                        }}
                      >
                        Buy Again <ChevronRight size={16} />
                      </button>
                      {["pending_payment", "confirmed", "processing"].includes(order.status) && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          style={{ 
                            background: "#fef2f2", 
                            color: "#ef4444", 
                            border: "none", 
                            padding: "12px 24px", 
                            borderRadius: "14px", 
                            fontWeight: 700, 
                            cursor: "pointer", 
                            fontSize: "0.85rem",
                            display: "flex",
                            alignItems: "center",
                            gap: 8
                          }}
                        >
                          <XCircle size={16} /> Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
