import { useParams, useNavigate, Link } from "react-router-dom";
import { useProduct } from "../hooks/useProducts";
import { useCartStore } from "../store/cartStore";
import { useWishlistStore } from "../store/wishlistStore";
import { useUser } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import api from "../lib/api";
import { Navbar } from "../components/Navbar";
import { Tag, Heart, MessageSquare, Star } from "lucide-react";

interface Review {
  id: number;
  rating: number;
  text: string;
  created_at: string;
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { product, loading } = useProduct(Number(id));
  const { isSignedIn } = useUser();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  
  const addToCart = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const wishlistItems = useWishlistStore((state) => state.items);
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const inCart = cartItems.some(i => product && i.product_id === product.id);

  const [simulatedStock, setSimulatedStock] = useState(0);
  const [simulatedPrice, setSimulatedPrice] = useState(0);

  useEffect(() => {
    if (product) {
      setSimulatedStock(product.stock);
      setSimulatedPrice(product.price);
    }
  }, [product?.id]);

  useEffect(() => {
    if (id) {
      api.get(`/api/reviews/product/${id}`).then((res) => setReviews(res.data)).catch(() => {});
    }
  }, [id]);

  // Simulation Interval
  useEffect(() => {
    const timer = setInterval(() => {
      if (simulatedStock > 1) {
        // 10% chance stock goes down
        if (Math.random() > 0.9) setSimulatedStock(prev => Math.max(0, prev - 1));
      }
      // 5% chance price changes +/- 1%
      if (Math.random() > 0.95) {
        setSimulatedPrice(prev => prev * (1 + (Math.random() * 0.02 - 0.01)));
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [simulatedStock, simulatedPrice]);

  useEffect(() => {
    if (product && quantity > simulatedStock) {
      setQuantity(Math.max(1, simulatedStock));
    }
  }, [simulatedStock]);

  if (loading) return (
    <div className="empty-state page-section">
      <div className="stack" style={{ placeItems: "center" }}>
        <p className="empty-title" style={{ fontSize: "1.4rem" }}>Loading product…</p>
      </div>
    </div>
  );

  if (!product) return (
    <div className="empty-state page-section">
      <div className="stack" style={{ placeItems: "center" }}>
        <p className="empty-title">Product not found</p>
        <button className="btn btn-primary" onClick={() => navigate("/")}>← Back to Shop</button>
      </div>
    </div>
  );

  const handleAddToCart = () => {
    if (!isSignedIn) { navigate("/login"); return; }
    if (!product || product.stock <= 0) return;
    const finalQty = Math.min(quantity, product.stock);
    addToCart({ id: product.id, product_id: product.id, quantity: finalQty, title: product.title, price: product.price, image_url: product.image_url });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>
      <Navbar />


      <section className="detail-grid page-section" style={{ marginTop: 20 }}>
        <div className="detail-card" style={{ padding: 0, overflow: "hidden", borderRadius: 32, border: "none" }}>
          <div className="detail-image" style={{ height: "100%" }}>
            <img 
              src={product.image_url} 
              alt={product.title} 
              style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
              onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
              onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.title)}&size=800&background=e0e7ff&color=6366f1&bold=true`; }}
            />
          </div>
        </div>

        <div className="detail-card detail-info" style={{ padding: 40, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className="stack" style={{ gap: 24 }}>
            <div className="detail-meta" style={{ display: "flex", gap: 12 }}>
              <span className="badge new" style={{ padding: "6px 12px", fontSize: "0.75rem" }}>{product.category}</span>
              {product.is_sale && <span className="pill sale" style={{ padding: "6px 12px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 6 }}><Tag size={14} /> ON SALE</span>}
            </div>
            
            <h1 className="detail-title">{product.title}</h1>
            
            <p className="detail-copy" style={{ fontSize: "1.1rem", color: "#64748b", lineHeight: 1.8 }}>
              {product.description || "Experience the pinnacle of design and functionality. This premium product is crafted with meticulous attention to detail, ensuring an unparalleled shopping experience that combines style with substance."}
            </p>
            
            <div className="detail-meta" style={{ marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span className="price" style={{ fontSize: "3.5rem", fontWeight: 700, color: "#1e293b" }}>₹{(simulatedPrice * quantity).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span className="muted" style={{ textDecoration: "line-through", fontSize: "1.2rem", color: "#94a3b8" }}>₹{(simulatedPrice * 1.2 * quantity).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <p className="muted small" style={{ marginTop: 8, color: "#94a3b8", fontWeight: 500 }}>ID: PROD-{product.id.toString().padStart(5, '0')}</p>
            </div>

            <div className="stack" style={{ gap: 20, marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <label className="label" style={{ margin: 0, fontWeight: 700 }}>Quantity</label>
                <div style={{ display: "flex", alignItems: "center", gap: 0, background: "#f1f5f9", padding: 4, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                   <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={simulatedStock <= 0}
                    style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                    onMouseOver={e => e.currentTarget.style.background = "#fff"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}
                   >-</button>
                   <input
                    type="number"
                    min="1"
                    max={simulatedStock}
                    value={simulatedStock > 0 ? quantity : 0}
                    readOnly
                    style={{ width: 50, textAlign: "center", border: "none", background: "transparent", fontWeight: 800, fontSize: "1.1rem", color: "#1e293b" }}
                  />
                  <button 
                    onClick={() => setQuantity(Math.min(simulatedStock, quantity + 1))}
                    disabled={simulatedStock <= quantity}
                    style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                    onMouseOver={e => e.currentTarget.style.background = "#fff"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}
                   >+</button>
                </div>
                {simulatedStock > 0 ? (
                  <span style={{ 
                    fontSize: "0.85rem", fontWeight: 700, 
                    color: (simulatedStock - quantity + 1) <= 5 ? "#f59e0b" : "#10b981",
                    background: (simulatedStock - quantity + 1) <= 5 ? "#fffbeb" : "#f0fdf4",
                    padding: "6px 12px", borderRadius: 10
                  }}>
                    {Math.max(0, simulatedStock - quantity + 1)} in stock
                  </span>
                ) : (
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ef4444", background: "#fef2f2", padding: "6px 12px", borderRadius: 10 }}>
                    Currently Out of Stock
                  </span>
                )}
              </div>
              
              <div className="detail-actions" style={{ display: "flex", gap: 16 }}>
                <button
                  className={`btn ${product.stock <= 0 ? "btn-ghost" : (added ? "btn-emerald" : "btn-primary")}`}
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                  style={{ flex: 2, padding: "16px", fontSize: "1rem", fontWeight: 600, borderRadius: 16, transition: "all 0.3s ease", opacity: product.stock <= 0 ? 0.6 : 1 }}
                >
                  {product.stock <= 0 ? "Sold Out" : (added ? "Added to Cart" : inCart ? "Add More" : "Add to Shopping Bag")}
                </button>
                <button
                  className={`btn btn-icon ${wishlistItems.includes(product.id) ? "product-fab active" : "product-fab"}`}
                  title={wishlistItems.includes(product.id) ? "Remove from wishlist" : "Save to wishlist"}
                  onClick={() => { if (!isSignedIn) { navigate("/login"); return; } toggleWishlist(product.id); }}
                  style={{ flex: 0.5, height: 60, width: 60, borderRadius: 16 }}
                >
                  {wishlistItems.includes(product.id) ? <Heart size={24} fill="#ef4444" color="#ef4444" /> : <Heart size={24} />}
                </button>
              </div>
              
              {!isSignedIn && (
                <div style={{ padding: "12px 16px", background: "#fef2f2", borderRadius: 12, border: "1px solid #fca5a5" }}>
                  <p className="muted" style={{ fontSize: "0.85rem", color: "#b91c1c", margin: 0, fontWeight: 600 }}>
                    Please <Link to="/login" style={{ color: "#b91c1c", textDecoration: "underline" }}>Sign In</Link> to complete your purchase.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="page-section" style={{ marginTop: 40 }}>
        <div className="detail-card" style={{ padding: 40, borderRadius: 32 }}>
          <div className="row-between" style={{ marginBottom: 30 }}>
            <div>
              <p className="panel-copy" style={{ fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Verified Customer Reviews</p>
              <h2 className="section-title" style={{ fontSize: "2.2rem", fontWeight: 800 }}>Reviews & Ratings</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ color: "#f59e0b", display: "flex", gap: 4 }}>
                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={20} fill="currentColor" />)}
              </div>
              <span className="pill success" style={{ padding: "6px 14px", fontWeight: 700 }}>{reviews.length} Verified</span>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="empty-state" style={{ minHeight: 200, background: "#f8fafc", borderRadius: 24 }}>
              <div className="stack" style={{ placeItems: "center" }}>
                <div style={{ marginBottom: 16, color: "#94a3b8" }}>
                  <MessageSquare size={64} />
                </div>
                <p className="empty-title" style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>No reviews yet</p>
                <p className="empty-copy" style={{ color: "#64748b" }}>Be the first to share your experience with this item.</p>
              </div>
            </div>
          ) : (
            <div className="reviews" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
              {reviews.map((review) => (
                <article key={review.id} className="review-card" style={{ padding: 24, borderRadius: 20, border: "1px solid #e2e8f0" }}>
                  <div className="row-between" style={{ marginBottom: 14 }}>
                    <div className="review-stars" style={{ display: "flex", gap: 2, color: "#f59e0b" }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} size={14} fill={i <= review.rating ? "currentColor" : "transparent"} />
                      ))}
                    </div>
                    <span className="muted small" style={{ fontWeight: 600 }}>{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                  <p style={{ margin: 0, lineHeight: 1.7, color: "#334155", fontSize: "0.95rem" }}>{review.text}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}



