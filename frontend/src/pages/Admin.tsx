import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import api from "../lib/api";
import { useUserStore } from "../store/userStore";
import { Navbar } from "../components/Navbar";
import { CustomDropdown } from "../components/CustomDropdown";
import { Loader2, Upload, Trash2, Edit3, Package, FileText, Tag, Box } from "lucide-react";



const STATUS_OPTIONS = [
  { value: "pending_payment", label: "Pending Payment", color: "#f59e0b" },
  { value: "confirmed", label: "Confirmed", color: "#6366f1" },
  { value: "processing", label: "Processing", color: "#06b6d4" },
  { value: "shipped", label: "Shipped", color: "#8b5cf6" },
  { value: "delivered", label: "Delivered", color: "#10b981" },
  { value: "cancelled", label: "Cancelled", color: "#ef4444" },
  { value: "refunded", label: "Refunded", color: "#f97316" },
];


const STATUS_COLORS: Record<string, string> = {
  pending_payment: "#f59e0b",
  confirmed: "#6366f1",
  processing: "#06b6d4",
  shipped: "#8b5cf6",
  delivered: "#10b981",
  cancelled: "#ef4444",
  refunded: "#f97316",
};

interface Product {
  id: number; title: string; description: string; price: number;
  category: string; image_url: string; is_sale: boolean; sold: boolean; stock: number;
}
interface Order {
  id: number; user_id: string; total_price: number; payment_method: string;
  status: string; created_at: string; users?: { name: string; email: string; phone: string };
}
interface Stats {
  total_orders: number; total_revenue: number; pending_orders: number;
  total_products: number; total_users: number;
}

const emptyProduct: Omit<Product, "id"> = {
  title: "", description: "", price: 0, category: "Electronics",
  image_url: "", is_sale: false, sold: false, stock: 10,
};

export const Admin = () => {
  const { isLoaded } = useUser();
  const { profile } = useUserStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"dashboard" | "products" | "orders" | "users">("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [orderFilter, setOrderFilter] = useState("all");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<typeof emptyProduct>({ ...emptyProduct });
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (isLoaded && !isAdmin) navigate("/");
  }, [isLoaded, isAdmin, navigate]);

  const fetchAll = async () => {
    try {
      const [p, o, s, u, c] = await Promise.all([
        api.get("/api/products").catch(() => ({ data: [] })),
        api.get("/api/admin/orders").catch(() => ({ data: [] })),
        api.get("/api/admin/stats").catch(() => ({ data: {} })),
        api.get("/api/admin/users").catch(() => ({ data: [] })),
        api.get("/api/products/categories").catch(() => ({ data: [] })),
      ]);
      setProducts(p.data || []);
      setOrders(o.data || []);
      setStats(s.data && s.data.total_orders !== undefined ? s.data : { total_orders: 0, total_revenue: 0, pending_orders: 0, total_products: 0, total_users: 0 });
      setUsers(u.data || []);
      setCategories(c.data || []);
    } catch (e) {
      console.error("Fetch all failed", e);
    }
  };

  // Real-time polling for Dashboard (Stats & Recent activity)
  useEffect(() => { 
    if (isAdmin) {
      fetchAll();
      const interval = setInterval(fetchAll, 30000); // 30s polling
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editProduct) {
        await api.put(`/api/admin/products/${editProduct.id}`, { ...newProduct });
      } else {
        await api.post("/api/admin/products", { ...newProduct });
      }
      await fetchAll();
      setEditProduct(null);
      setNewProduct({ ...emptyProduct });
      setShowAddForm(false);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    await api.delete(`/api/admin/products/${id}`);
    setProducts(p => p.filter(x => x.id !== id));
  };

  const handleStatusChange = async (orderId: number, status: string) => {
    await api.put(`/api/admin/orders/${orderId}/status?status=${status}`);
    fetchAll(); // Refresh everything to sync stats
    if (orderDetail?.order?.id === orderId) {
      setOrderDetail((d: any) => ({ ...d, order: { ...d.order, status } }));
    }
  };

  /* 
  const handleImageUpload = async (productId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await api.post(`/api/admin/upload/product-image/${productId}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.url;
    } catch (e) {
      console.error("Upload failed", e);
      return "";
    }
  };
  */

  const openEdit = async (id: number) => {
    try {
      setSaving(true); // Show loader while fetching latest
      const res = await api.get(`/api/products/${id}`);
      const p = res.data;
      if (!p) throw new Error("Product not found");
      
      setEditProduct(p);
      setNewProduct({ 
        title: p.title, 
        description: p.description, 
        price: p.price, 
        category: p.category, 
        image_url: p.image_url, 
        is_sale: p.is_sale, 
        sold: p.sold, 
        stock: p.stock ?? 0 
      });
      setShowAddForm(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Failed to fetch product for editing", err);
    } finally {
      setSaving(false);
    }
  };

  const filteredOrders = orderFilter === "all" ? orders : orders.filter(o => o.status === orderFilter);

  if (!isLoaded) return null;

  return (
    <div style={{ fontFamily: "Inter, sans-serif", minHeight: "100vh" }}>
      <Navbar adminMode activeTab={tab} onTabChange={setTab} />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px", paddingTop: 40 }}>
        {/* Dashboard Tab */}
        {tab === "dashboard" && (
          <section className="page-section">
            <div className="mesh-bg" style={{ marginBottom: 40, padding: 48, borderRadius: 32 }}>
              <p className="panel-copy" style={{ color: "#6366f1", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>EXECUTIVE OVERVIEW</p>
              <h1 className="section-title" style={{ fontSize: "3rem", fontWeight: 900, margin: 0, letterSpacing: "-0.04em" }}>Command Dashboard</h1>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24, marginBottom: 40 }}>
              {[
                { label: "Total Revenue", value: `₹${(stats?.total_revenue || 0).toLocaleString()}`, color: "#6366f1", symbol: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> },
                { label: "Total Orders", value: stats?.total_orders ?? 0, color: "#06b6d4", symbol: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> },
                { label: "Pending Orders", value: stats?.pending_orders ?? 0, color: "#f59e0b", symbol: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> },
                { label: "Active Products", value: stats?.total_products ?? products.length, color: "#8b5cf6", symbol: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg> },
                { label: "Total Customers", value: stats?.total_users ?? users.length, color: "#10b981", symbol: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
              ].map(s => (
                <div key={s.label} className="admin-card hover-pop" style={{ 
                  padding: 24, borderRadius: 24, background: "#fff", border: "none",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", gap: 8
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: s.color }}>{s.symbol}</span>
                    <span style={{ background: s.color + "15", color: s.color, padding: "4px 10px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 800 }}>LIVE</span>
                  </div>
                  <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "#1e293b", marginTop: 8 }}>{s.value}</div>
                  <div style={{ color: "#64748b", fontWeight: 600, fontSize: "0.95rem" }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32 }}>
              {/* Recent Orders */}
              <div className="admin-card hover-pop" style={{ borderRadius: 32, padding: 32, background: "#fff", border: "none" }}>
                <div className="row-between" style={{ marginBottom: 24 }}>
                  <h2 className="panel-title" style={{ margin: 0, fontSize: "1.5rem" }}>Recent Activity</h2>
                  <button className="btn btn-ghost" onClick={() => setTab("orders")} style={{ fontSize: "0.9rem" }}>Full Order Log →</button>
                </div>
                <div className="table-shell" style={{ border: "none" }}>
                  <table className="table">
                    <thead><tr style={{ background: "#f8fafc" }}><th style={{ borderRadius: "12px 0 0 12px" }}>Order</th><th>Customer</th><th>Amount</th><th>Status</th><th style={{ borderRadius: "0 12px 12px 0" }}>Date</th></tr></thead>
                    <tbody>
                      {orders.slice(0, 8).map(o => (
                        <tr key={o.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "16px 12px" }}><strong>#{o.id}</strong></td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{o.users?.name || "Guest"}</div>
                            <div className="muted" style={{ fontSize: "0.75rem" }}>{o.users?.email}</div>
                          </td>
                          <td style={{ fontWeight: 800, color: "#6366f1" }}>₹{o.total_price}</td>
                          <td>
                            <span style={{ 
                              display: "inline-block", padding: "6px 12px", borderRadius: 10, fontSize: "0.75rem", fontWeight: 800,
                              background: STATUS_COLORS[o.status] + "15", color: STATUS_COLORS[o.status] 
                            }}>
                              {o.status.replace(/_/g, " ").toUpperCase()}
                            </span>
                          </td>
                          <td className="muted" style={{ fontSize: "0.85rem" }}>{new Date(o.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Users */}
              <div className="admin-card" style={{ borderRadius: 32, padding: 32, background: "#fff", border: "none" }}>
                <div className="row-between" style={{ marginBottom: 24 }}>
                  <h2 className="panel-title" style={{ margin: 0, fontSize: "1.5rem" }}>New Customers</h2>
                  <button className="btn btn-ghost" onClick={() => setTab("users")}>View All</button>
                </div>
                <div className="stack" style={{ gap: 20 }}>
                  {users.slice(0, 6).map(u => (
                    <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #06b6d4)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800 }}>
                        {u.avatar_url ? <img src={u.avatar_url} style={{ width: "100%", height: "100%", borderRadius: 12, objectFit: "cover" }} /> : (u.name || u.email || "?")[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{u.name || "Unnamed User"}</div>
                        <div className="muted" style={{ fontSize: "0.8rem" }}>{u.email}</div>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>{new Date(u.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                  {users.length === 0 && <p className="muted" style={{ textAlign: "center", padding: "20px 0" }}>No users registered yet.</p>}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Products Tab */}
        {tab === "products" && (
          <section className="page-section">
            <div className="row-between" style={{ marginBottom: 32 }}>
              <div>
                <p className="panel-copy" style={{ color: "#6366f1", fontWeight: 800 }}>INVENTORY CONTROL</p>
                <h1 className="section-title" style={{ fontSize: "2.5rem", fontWeight: 900 }}>Products List</h1>
              </div>
              <button className="btn btn-primary" onClick={() => { setEditProduct(null); setNewProduct({ ...emptyProduct }); setShowAddForm(true); }} style={{ padding: "14px 24px", borderRadius: 16, fontSize: "1rem", fontWeight: 700 }}>
                + Launch New Product
              </button>
            </div>

            {showAddForm && (
              <div className="admin-card" style={{ 
                marginBottom: 40, borderRadius: 40, padding: "48px", background: "#fff", border: "none",
                boxShadow: "0 20px 40px -10px rgba(0,0,0,0.05)", animation: "slide-up 0.3s ease-out"
              }}>
                <div className="row-between" style={{ marginBottom: 32 }}>
                  <div>
                    <p style={{ color: "#6366f1", fontWeight: 800, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>Product Management</p>
                    <h2 className="panel-title" style={{ margin: 0, fontSize: "2rem", fontWeight: 900 }}>{editProduct ? "Modify Record" : "Launch New Product"}</h2>
                  </div>
                  <button className="btn btn-ghost" onClick={() => { setShowAddForm(false); setEditProduct(null); }} style={{ width: 44, height: 44, borderRadius: "14px", display: "grid", placeItems: "center", background: "#f8fafc" }}>✕</button>
                </div>

                <form onSubmit={handleSaveProduct} className="stack" style={{ gap: 32 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr 1.5fr", gap: 40 }}>
                    
                    {/* Column 1: Visual Identity */}
                    <div className="stack" style={{ gap: 16 }}>
                      <label className="label" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
                        <Upload size={16} /> Visual Asset
                      </label>
                      <div 
                        onClick={() => imageRef.current?.click()}
                        style={{ 
                          width: "100%", aspectRatio: "1/1", borderRadius: 32, background: "#f8fafc", 
                          border: "2px dashed #e2e8f0", cursor: "pointer", overflow: "hidden",
                          display: "grid", placeItems: "center", transition: "all 0.2s"
                        }}
                      >
                        {newProduct.image_url ? (
                          <img src={newProduct.image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div className="stack" style={{ alignItems: "center", color: "#94a3b8", gap: 8 }}>
                             <Upload size={32} />
                             <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>Click to Upload</span>
                          </div>
                        )}
                      </div>
                      <input type="file" ref={imageRef} hidden onChange={async e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setSaving(true);
                          try {
                            const form = new FormData();
                            form.append("file", f);
                            const res = await api.post("/api/admin/upload/temp", form, { headers: { "Content-Type": "multipart/form-data" } });
                            setNewProduct(p => ({ ...p, image_url: res.data.url }));
                          } catch(err) { console.error(err); }
                          setSaving(false);
                        }
                      }} accept="image/*" />
                      <div className="field">
                        <label className="label" style={{ fontSize: "0.7rem", color: "#94a3b8" }}>OR USE EXTERNAL LINK</label>
                        <input className="input" placeholder="https://..." value={newProduct.image_url} onChange={e => setNewProduct(p => ({ ...p, image_url: e.target.value }))} style={{ borderRadius: 14, fontSize: "0.85rem" }} />
                      </div>
                    </div>

                    {/* Column 2: Identity & Content */}
                    <div className="stack" style={{ gap: 24 }}>
                      <div className="field">
                        <label className="label" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
                          <Package size={16} /> Product Title
                        </label>
                        <input className="input" required value={newProduct.title} onChange={e => setNewProduct(p => ({ ...p, title: e.target.value }))} placeholder="Title..." style={{ borderRadius: 16, padding: "14px 18px" }} />
                      </div>
                      <div className="field">
                        <label className="label" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
                          <FileText size={16} /> Story & Details
                        </label>
                        <textarea className="input" required rows={8} value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))} placeholder="Product description..." style={{ borderRadius: 16, padding: "14px 18px", resize: "none" }} />
                      </div>
                    </div>

                    {/* Column 3: Logistics & Configuration */}
                    <div className="stack" style={{ gap: 24 }}>
                      <CustomDropdown 
                        label="Product Type"
                        options={categories.map(c => ({ value: c.name, label: c.name }))}
                        value={newProduct.category}
                        onChange={val => setNewProduct(p => ({ ...p, category: val }))}
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div className="field">
                          <label className="label" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
                            <Tag size={16} /> Price (₹)
                          </label>
                          <input className="input" type="number" required min="0" value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: Number(e.target.value) }))} style={{ borderRadius: 14 }} />
                        </div>
                        <div className="field">
                          <label className="label" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
                            <Box size={16} /> Stock
                          </label>
                          <input className="input" type="number" required min="0" value={(newProduct as any).stock ?? 10} onChange={e => setNewProduct(p => ({ ...p, stock: Number(e.target.value) }))} style={{ borderRadius: 14 }} />
                        </div>
                      </div>

                      <div className="stack" style={{ gap: 14, padding: "24px", background: "#f8fafc", borderRadius: 24, border: "1px solid #f1f5f9" }}>
                         <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontWeight: 700 }}>
                           <input type="checkbox" checked={newProduct.is_sale} onChange={e => setNewProduct(p => ({ ...p, is_sale: e.target.checked }))} style={{ width: 18, height: 18, accentColor: "#6366f1" }} />
                           Enable Promo Active
                         </label>
                         <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontWeight: 700 }}>
                           <input type="checkbox" checked={newProduct.sold} onChange={e => setNewProduct(p => ({ ...p, sold: e.target.checked }))} style={{ width: 18, height: 18, accentColor: "#6366f1" }} />
                           Mark as Sold Out
                         </label>
                      </div>

                      <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: "auto", padding: "18px", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: "1rem" }}>
                        {saving ? <Loader2 size={22} className="spin" /> : <Package size={22} />}
                        {saving ? "Syncing..." : editProduct ? "Save Changes" : "Publish Product"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            <div className="admin-card" style={{ borderRadius: 32, padding: 32, background: "#fff", border: "none" }}>
              <div className="table-shell" style={{ border: "none" }}>
                <table className="table">
                  <thead><tr style={{ background: "#f8fafc" }}><th style={{ borderRadius: "12px 0 0 12px" }}>Product Identity</th><th>Category</th><th>Valuation</th><th>Stock</th><th>Status</th><th style={{ borderRadius: "0 12px 12px 0" }}>Management</th></tr></thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "16px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <img src={p.image_url} alt={p.title} 
                              style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 14, background: "#f1f5f9" }} 
                              onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.title)}&size=100&background=e0e7ff&color=6366f1&bold=true`; }} />
                            <div>
                              <div style={{ fontWeight: 800, color: "#1e293b", fontSize: "1rem" }}>{p.title}</div>
                              <div className="muted" style={{ fontSize: "0.75rem" }}>SKU: P-{p.id}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ 
                            padding: "6px 14px", borderRadius: 12, fontSize: "0.8rem", fontWeight: 700,
                            background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0"
                          }}>
                            {p.category}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 900, color: "#6366f1", fontSize: "1.1rem" }}>
                            ₹{p.price.toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ 
                              background: "#f8fafc", 
                              border: "1px solid #e2e8f0", 
                              borderRadius: "12px", 
                              padding: "8px 16px",
                              minWidth: "60px",
                              textAlign: "center",
                              fontWeight: 800,
                              color: "#1e293b",
                              fontSize: "0.95rem"
                            }}>
                              {p.stock ?? 0}
                            </div>
                            <span style={{ 
                              fontSize: "0.7rem", 
                              color: (p.stock ?? 0) <= 5 ? "#ef4444" : "#10b981", 
                              fontWeight: 800,
                              letterSpacing: "0.05em"
                            }}>
                              {(p.stock ?? 0) <= 5 ? "LOW" : "OK"}
                            </span>
                          </div>
                        </td>
                        <td>
                          {p.sold ? <span className="pill" style={{ background: "#fef2f2", color: "#ef4444" }}>Out of Stock</span> : (p.is_sale ? <span className="pill sale">Promo Active</span> : <span className="pill success">Available</span>)}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn btn-ghost" style={{ padding: "8px 14px", borderRadius: 10, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }} onClick={() => openEdit(p.id)}>
                              <Edit3 size={14} /> Modify
                            </button>
                            <button className="btn btn-danger" style={{ padding: "8px 14px", borderRadius: 10, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }} onClick={() => handleDelete(p.id)}>
                              <Trash2 size={14} /> Archive
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Orders Tab */}
        {tab === "orders" && (
          <section className="page-section">
            <div className="row-between" style={{ marginBottom: 32 }}>
              <div>
                <p className="panel-copy" style={{ color: "#6366f1", fontWeight: 800 }}>FULFILLMENT CENTER</p>
                <h1 className="section-title" style={{ fontSize: "2.5rem", fontWeight: 900 }}>Customer Orders</h1>
              </div>
               <div className="inline-actions" style={{ gap: 8, background: "#fff", padding: 6, borderRadius: 18, border: "1px solid #e2e8f0" }}>
                {["all", ...STATUS_OPTIONS.map(opt => opt.value)].map(s => (
                  <button key={s} onClick={() => setOrderFilter(s)}
                    style={{ 
                      fontSize: "0.82rem", padding: "10px 16px", textTransform: "capitalize", borderRadius: 14, border: "none", cursor: "pointer",
                      background: orderFilter === s ? "#6366f1" : "transparent",
                      color: orderFilter === s ? "#fff" : "#64748b",
                      fontWeight: 700, transition: "all 0.2s ease"
                    }}>
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Order Detail Modal */}
            {orderDetail && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
                onClick={e => { if (e.target === e.currentTarget) setOrderDetail(null); }}>
                <div className="admin-card" style={{ maxWidth: 1000, width: "100%", borderRadius: 40, padding: "48px 56px", background: "#fff", border: "none", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", position: "relative" }}>
                  <div className="row-between" style={{ marginBottom: 40 }}>
                    <div>
                       <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                         <p style={{ color: "#6366f1", fontWeight: 800, margin: 0, fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Invoice Record</p>
                         <span style={{ 
                           padding: "4px 12px", borderRadius: 10, fontSize: "0.7rem", fontWeight: 900,
                           background: STATUS_COLORS[orderDetail.order.status] + "15", 
                           color: STATUS_COLORS[orderDetail.order.status],
                           border: `1px solid ${STATUS_COLORS[orderDetail.order.status]}30`
                         }}>
                           {orderDetail.order.status.replace(/_/g, " ").toUpperCase()}
                         </span>
                       </div>
                       <h2 className="panel-title" style={{ margin: 0, fontSize: "2.5rem", fontWeight: 900, color: "#0f172a" }}>Order #{orderDetail.order.id}</h2>
                    </div>
                    <button className="btn btn-ghost" onClick={() => setOrderDetail(null)} style={{ width: 54, height: 54, borderRadius: "20px", display: "grid", placeItems: "center", padding: 0, background: "#f8fafc", transition: "all 0.2s" }}>✕</button>
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginBottom: 40 }}>
                    <div className="stack" style={{ gap: 20, padding: 28, background: "#f8fafc", borderRadius: 32, border: "1px solid #f1f5f9" }}>
                       <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 10 }}>
                         <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1" }}></div>
                         Customer Details
                       </h3>
                       <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #6366f1, #06b6d4)", display: "grid", placeItems: "center", color: "#fff", fontSize: "1rem", fontWeight: 800 }}>
                            {orderDetail.order.users?.name?.[0] || "A"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#1e293b" }}>{orderDetail.order.users?.name || "Anonymous"}</div>
                            <div style={{ color: "#64748b", fontWeight: 600, fontSize: "0.85rem" }}>{orderDetail.order.users?.email}</div>
                          </div>
                       </div>
                    </div>

                    <div className="stack" style={{ gap: 20, padding: 28, background: "#f8fafc", borderRadius: 32, border: "1px solid #f1f5f9", height: "100%" }}>
                       <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 10 }}>
                         <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#06b6d4" }}></div>
                         Delivery Info
                       </h3>
                       {orderDetail.address ? (
                        <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
                          <div style={{ 
                            fontSize: "0.85rem", 
                            fontWeight: 600, 
                            color: "#475569",
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            lineHeight: "1.5",
                            textTransform: "capitalize" // Professional simple case
                          }}>
                            {orderDetail.address.street}, {orderDetail.address.city}, {orderDetail.address.state} - {orderDetail.address.zip_code}
                          </div>
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed #e2e8f0", display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "#6366f1", fontWeight: 800 }}>
                             <span style={{ opacity: 0.6 }}>Customer Mobile:</span>
                             <span>{orderDetail.order.users?.phone || "—"}</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.9rem", color: "#94a3b8", fontStyle: "italic" }}>No logistics data saved</div>
                      )}
                    </div>
                    
                    <div className="stack" style={{ gap: 20, padding: 28, background: "#f8fafc", borderRadius: 32, border: "1px solid #f1f5f9" }}>
                       <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 10 }}>
                         <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }}></div>
                         Logistics Control
                       </h3>
                       <div className="field">
                        <CustomDropdown 
                          label="Change Order Status"
                          options={STATUS_OPTIONS}
                          value={orderDetail.order.status}
                          onChange={val => handleStatusChange(orderDetail.order.id, val)}
                        />
                       </div>
                    </div>
                  </div>

                  <div className="table-shell" style={{ border: "1px solid #f1f5f9", borderRadius: 32, overflow: "hidden", marginBottom: 32 }}>
                    <table className="table">
                      <thead><tr style={{ background: "#f8fafc" }}><th style={{ padding: "20px" }}>Item Name</th><th style={{ width: 80, textAlign: "center" }}>Qty</th><th style={{ width: 140, textAlign: "right" }}>Unit Price</th><th style={{ width: 140, textAlign: "right", paddingRight: "24px" }}>Subtotal</th></tr></thead>
                      <tbody>
                        {orderDetail.items.map((item: any) => (
                          <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "20px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                <img src={item.products?.image_url} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 16, background: "#f1f5f9" }} />
                                <span style={{ fontWeight: 800, color: "#1e293b" }}>{item.products?.title}</span>
                              </div>
                            </td>
                            <td style={{ fontWeight: 800, textAlign: "center", color: "#64748b" }}>{item.quantity}</td>
                            <td style={{ textAlign: "right", fontWeight: 700, color: "#64748b" }}>₹{item.price.toLocaleString()}</td>
                            <td style={{ textAlign: "right", fontWeight: 900, color: "#6366f1", paddingRight: "24px", fontSize: "1.1rem" }}>₹{(item.price * item.quantity).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="row-between" style={{ padding: "40px 48px", background: "linear-gradient(135deg, #0f172a, #1e293b)", borderRadius: 40, color: "#fff" }}>
                    <div>
                       <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#94a3b8", marginBottom: 4 }}>TOTAL REVENUE COLLECTED</div>
                       <div style={{ fontSize: "0.85rem", color: "#6366f1", fontWeight: 800 }}>{orderDetail.order.payment_method} TRANSACTION • {new Date(orderDetail.order.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ fontSize: "3.2rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>₹{orderDetail.order.total_price.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="admin-card" style={{ borderRadius: 32, padding: 32, background: "#fff", border: "none" }}>
              <div className="table-shell" style={{ border: "none" }}>
                <table className="table">
                  <thead><tr style={{ background: "#f8fafc" }}><th style={{ borderRadius: "12px 0 0 12px" }}>Order ID</th><th>Customer Info</th><th>Amount</th><th style={{ width: 240 }}>Status Tracker</th><th>Date</th><th style={{ borderRadius: "0 12px 12px 0" }}>Control</th></tr></thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o.id} style={{ 
                        borderBottom: "1px solid #f1f5f9",
                        transition: "all 0.2s",
                        background: STATUS_COLORS[o.status] + "08",
                        borderLeft: `5px solid ${STATUS_COLORS[o.status]}`,
                      }}>
                        <td style={{ padding: "20px 12px" }}><strong>#{o.id}</strong></td>
                        <td>
                          <div style={{ fontWeight: 700, color: "#1e293b" }}>{o.users?.name || "Guest User"}</div>
                          <div className="muted" style={{ fontSize: "0.8rem" }}>{o.users?.email}</div>
                        </td>
                        <td style={{ fontWeight: 900, color: "#1e293b", fontSize: "1.1rem" }}>₹{o.total_price.toLocaleString()}</td>
                        <td>
                          <div style={{ width: 240 }}>
                            <CustomDropdown 
                              options={STATUS_OPTIONS}
                              value={o.status}
                              onChange={val => handleStatusChange(o.id, val)}
                            />
                          </div>
                        </td>
                        <td className="muted" style={{ fontWeight: 600 }}>{new Date(o.created_at).toLocaleDateString()}</td>
                        <td>
                          <button className="btn btn-ghost" style={{ padding: "10px 18px", borderRadius: 12, fontSize: "0.85rem", fontWeight: 700 }}
                            onClick={async () => {
                              const res = await api.get(`/api/admin/orders/${o.id}`);
                              setOrderDetail(res.data);
                            }}>View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <section className="page-section">
            <div style={{ marginBottom: 32 }}>
              <p className="panel-copy" style={{ color: "#10b981", fontWeight: 800 }}>CUSTOMER RELATIONSHIP</p>
              <h1 className="section-title" style={{ fontSize: "2.5rem", fontWeight: 900 }}>User Management ({users.length})</h1>
            </div>
            <div className="admin-card" style={{ borderRadius: 32, padding: 32, background: "#fff", border: "none" }}>
              <div className="table-shell" style={{ border: "none" }}>
                <table className="table">
                  <thead><tr style={{ background: "#f8fafc" }}><th style={{ borderRadius: "12px 0 0 12px" }}>User Identity</th><th>Contact Email</th><th>Phone Number</th><th>Shipping Logistics</th><th>Access Role</th><th style={{ borderRadius: "0 12px 12px 0" }}>Joined Since</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "18px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#06b6d4)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800 }}>
                              {u.avatar_url ? <img src={u.avatar_url} style={{ width: "100%", height: "100%", borderRadius: 14, objectFit: "cover" }} /> : (u.name || u.email || "?")[0].toUpperCase()}
                            </div>
                            <strong style={{ fontSize: "1rem", color: "#1e293b" }}>{u.name || "Unnamed"}</strong>
                          </div>
                        </td>
                        <td className="muted" style={{ fontWeight: 600 }}>{u.email}</td>
                        <td className="muted" style={{ fontWeight: 600 }}>{u.phone || "—"}</td>
                        <td className="muted" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                          {u.addresses ? (
                            <div>
                              {u.addresses.street}, {u.addresses.city}<br/>
                              {u.addresses.state}
                            </div>
                          ) : "No Address Saved"}
                        </td>
                        <td>
                          <span style={{ 
                            padding: "6px 12px", borderRadius: 10, fontSize: "0.75rem", fontWeight: 800,
                            background: u.role === "admin" ? "#6366f115" : "#10b98115", 
                            color: u.role === "admin" ? "#6366f1" : "#10b981" 
                          }}>
                            {u.role?.toUpperCase() || "USER"}
                          </span>
                        </td>
                        <td className="muted" style={{ fontSize: "0.85rem" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
