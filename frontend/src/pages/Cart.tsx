import { useCartStore } from "../store/cartStore";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";

export const Cart = () => {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const total = useCartStore((state) => state.total)();
  const navigate = useNavigate();

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  if (items.length === 0) {
    return (
      <div style={{ fontFamily: "Inter, sans-serif" }}>
        <Navbar />
        <div className="empty-state page-section" style={{ minHeight: "70vh" }}>
          <div className="stack" style={{ placeItems: "center" }}>
            <div style={{ marginBottom: 24, padding: 32, background: "#f1f5f9", borderRadius: "50%", color: "#6366f1" }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            </div>
            <p className="empty-title" style={{ fontSize: "2rem", fontWeight: 900 }}>Your cart is empty</p>
            <p className="empty-copy" style={{ fontSize: "1.1rem", maxWidth: 400, color: "#64748b" }}>Looks like you haven't added anything to your cart yet. Browse our collections to find something you love.</p>
            <button onClick={() => navigate("/")} className="btn btn-primary" style={{ marginTop: 32, padding: "16px 40px", borderRadius: 16, fontSize: "1rem", fontWeight: 700 }}>Start Shopping</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", minHeight: "100vh" }}>
      <Navbar />


      <section className="page-section" style={{ maxWidth: 1200, margin: "20px auto 60px" }}>
        <div style={{ marginBottom: 32 }}>
          <p className="panel-copy" style={{ color: "#6366f1", fontWeight: 800 }}>MY SELECTIONS</p>
          <h1 className="section-title" style={{ fontSize: "2.5rem", fontWeight: 900 }}>Shopping Bag ({cartCount})</h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 32, alignItems: "start" }}>
          {/* Left: Product List */}
          <div className="stack" style={{ gap: 20 }}>
            {items.map((item) => (
              <div key={item.id} className="admin-card" style={{ background: "#fff", borderRadius: 24, padding: 20, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", display: "flex", gap: 20, alignItems: "center" }}>
                <div style={{ width: 100, height: 100, borderRadius: 16, overflow: "hidden", flexShrink: 0, background: "#f1f5f9" }}>
                   <img src={item.image_url} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).src = "https://ui-avatars.com/api/?name=P&background=f1f5f9&color=6366f1"; }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                       <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#1e293b" }}>{item.title}</h3>
                       <p className="muted small" style={{ marginTop: 4 }}>Unit Price: ₹{item.price.toLocaleString()}</p>
                    </div>
                    <button onClick={() => removeItem(item.id)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#ef4444", fontSize: "1.2rem", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  </div>
                  <div className="row-between" style={{ marginTop: 12 }}>
                     <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#f8fafc", padding: "2px 6px", borderRadius: 10, height: 36 }}>
                        <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} style={{ width: 28, height: 28, border: "none", background: "#fff", borderRadius: 6, cursor: "pointer", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
                        <span style={{ minWidth: 24, textAlign: "center", fontWeight: 800 }}>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ width: 28, height: 28, border: "none", background: "#fff", borderRadius: 6, cursor: "pointer", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                     </div>
                     <div style={{ fontWeight: 900, color: "#1e293b", fontSize: "1.1rem" }}>₹{(item.price * item.quantity).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Summary Sidebar */}
          <div className="stack" style={{ gap: 20, position: "sticky", top: 100 }}>
             <div className="checkout-card" style={{ background: "#fff", borderRadius: 28, padding: 32, border: "none", boxShadow: "0 10px 40px rgba(0,0,0,0.06)" }}>
                <p style={{ color: "#64748b", fontWeight: 800, fontSize: "0.8rem", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.06em" }}>Order Summary</p>
                <div className="stack" style={{ gap: 16, marginBottom: 24 }}>
                   <div className="row-between">
                      <span style={{ color: "#64748b", fontWeight: 500 }}>Subtotal</span>
                      <span style={{ fontWeight: 700 }}>₹{total.toLocaleString()}</span>
                   </div>
                   <div className="row-between">
                      <span style={{ color: "#64748b", fontWeight: 500 }}>Shipping</span>
                      <span style={{ fontWeight: 800, color: "#10b981" }}>FREE</span>
                   </div>
                   <div style={{ height: 1, background: "#f1f5f9", margin: "8px 0" }} />
                   <div className="row-between">
                      <span style={{ fontSize: "1.1rem", fontWeight: 800 }}>Total</span>
                      <span style={{ fontSize: "2.2rem", fontWeight: 900, color: "#6366f1" }}>₹{total.toLocaleString()}</span>
                   </div>
                </div>
                
                <button 
                   onClick={() => navigate("/checkout")} 
                   className="btn btn-primary" 
                   style={{ width: "100%", padding: "18px", borderRadius: 16, fontSize: "1.1rem", fontWeight: 800, boxShadow: "0 10px 25px rgba(99, 102, 241, 0.2)" }}
                >
                   Proceed to Checkout →
                </button>
                <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500 }}>
                   Safe & Secure Payments via Razorpay
                </p>
             </div>

             <div style={{ background: "#f1f5f9", borderRadius: 24, padding: 20, display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", color: "#6366f1" }}>
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                </div>
                <div>
                   <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>Purchase Protection</div>
                   <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>Shop with confidence. Your data is encrypted.</p>
                </div>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
};
