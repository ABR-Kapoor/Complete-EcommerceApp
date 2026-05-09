import { useParams, useNavigate, Link } from "react-router-dom";
import { useProduct } from "../hooks/useProducts";
import { useCartStore } from "../store/cartStore";
import { useWishlistStore } from "../store/wishlistStore";
import { useUser } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import api from "../lib/api";
import { Navbar } from "../components/Navbar";
import { Tag, Heart, MessageSquare, Star, Loader2, Check } from "lucide-react";

interface Review {
  id: number;
  rating: number;
  text: string;
  created_at: string;
  users?: {
    name: string;
    avatar_url: string;
  }
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { product, loading } = useProduct(Number(id));
  const { isSignedIn, user } = useUser();
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

  // Review Form State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

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

  useEffect(() => {
    const timer = setInterval(() => {
      if (simulatedStock > 1) {
        if (Math.random() > 0.9) setSimulatedStock(prev => Math.max(0, prev - 1));
      }
      if (Math.random() > 0.95) {
        setSimulatedPrice(prev => prev * (1 + (Math.random() * 0.02 - 0.01)));
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [simulatedStock, simulatedPrice]);

  if (loading) return (
    <div className="empty-state page-section">
      <div className="stack" style={{ placeItems: "center" }}>
        <Loader2 className="spin" size={48} color="var(--accent)" />
        <p className="empty-title" style={{ fontSize: "1.4rem", marginTop: 24 }}>Loading product…</p>
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
    addToCart({ 
      id: Date.now(), 
      product_id: product.id, 
      quantity: finalQty, 
      title: product.title, 
      price: product.price, 
      image_url: product.image_url 
    }, user?.id);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const handleSubmitReview = async () => {
    if (!isSignedIn) { navigate("/login"); return; }
    if (!reviewText) return;
    setSubmittingReview(true);
    try {
      const response = await api.post(`/api/reviews/?user_id=${user?.id}`, {
        order_id: 0, 
        product_id: product.id,
        rating: reviewRating,
        text: reviewText
      });
      
      if (response.data.error) {
        alert(`Error: ${response.data.error}`);
        return;
      }

      setReviewText("");
      setReviewRating(5);
      setReviewSubmitted(true);
      
      // Real-time re-fetch
      const res = await api.get(`/api/reviews/product/${product.id}`);
      setReviews(res.data);
    } catch (err) {
      console.error("Review submission failed", err);
      alert("Network Error: Could not reach the server.");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <Navbar />
      
      <main className="page-section" style={{ maxWidth: 1200, margin: "0 auto", paddingTop: 180 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, marginBottom: 80 }}>
          {/* Product Image */}
          <div style={{ position: "sticky", top: 130, alignSelf: "start" }}>
            <div style={{ borderRadius: 40, overflow: "hidden", background: "#fff", boxShadow: "0 20px 50px rgba(0,0,0,0.05)" }}>
              <img 
                src={product.image_url} 
                alt={product.title} 
                style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover" }}
                onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.title)}&size=800&background=e0e7ff&color=6366f1&bold=true`; }}
              />
            </div>
          </div>

          {/* Product Details */}
          <div className="stack" style={{ gap: 32 }}>
            <div className="stack" style={{ gap: 12 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <span className="badge" style={{ padding: "8px 16px", borderRadius: 12, background: "#e0e7ff", color: "#4f46e5", fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase" }}>{product.category}</span>
                {product.is_sale && <span className="badge" style={{ padding: "8px 16px", borderRadius: 12, background: "#fef2f2", color: "#ef4444", fontWeight: 800, fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 6 }}><Tag size={14} /> SALE</span>}
              </div>
              <h1 style={{ fontSize: "3.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.1, letterSpacing: "-0.02em" }}>{product.title}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                 <div style={{ display: "flex", color: "#f59e0b" }}>
                   {[1,2,3,4,5].map(i => <Star key={i} size={18} fill="currentColor" />)}
                 </div>
                 <span style={{ color: "#64748b", fontWeight: 600 }}>({reviews.length} Customer Reviews)</span>
              </div>
            </div>

            <p style={{ fontSize: "1.15rem", color: "#475569", lineHeight: 1.8 }}>
              {product.description || "Elevate your daily routine with this masterfully crafted essential. Designed for those who appreciate the perfect balance of aesthetic appeal and functional excellence."}
            </p>

            <div style={{ padding: 32, background: "#fff", borderRadius: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 24 }}>
                <span style={{ fontSize: "3rem", fontWeight: 900, color: "#0f172a" }}>₹{(simulatedPrice || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span style={{ fontSize: "1.2rem", color: "#94a3b8", textDecoration: "line-through" }}>₹{((simulatedPrice || 0) * 1.2).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>

              <div className="stack" style={{ gap: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <label style={{ fontWeight: 800, fontSize: "0.9rem", color: "#64748b" }}>Quantity</label>
                  <div style={{ display: "flex", alignItems: "center", background: "#f8fafc", padding: 6, borderRadius: 16, border: "1px solid #e2e8f0" }}>
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ width: 40, height: 40, border: "none", background: "transparent", cursor: "pointer", fontWeight: 900, fontSize: "1.2rem" }}>-</button>
                    <span style={{ minWidth: 40, textAlign: "center", fontWeight: 800, fontSize: "1.1rem" }}>{quantity}</span>
                    <button onClick={() => setQuantity(Math.min(simulatedStock || 0, quantity + 1))} style={{ width: 40, height: 40, border: "none", background: "transparent", cursor: "pointer", fontWeight: 900, fontSize: "1.2rem" }}>+</button>
                  </div>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: (simulatedStock || 0) < 5 ? "#ef4444" : "#10b981" }}>
                    {(simulatedStock || 0)} in stock
                  </span>
                </div>

                <div style={{ display: "flex", gap: 16 }}>
                  <button
                    onClick={handleAddToCart}
                    disabled={simulatedStock <= 0}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: "20px", borderRadius: 20, fontSize: "1.1rem", fontWeight: 800, boxShadow: "0 10px 30px rgba(99, 102, 241, 0.3)" }}
                  >
                    {added ? <><Check size={20} /> Added!</> : (inCart ? "Add More to Bag" : "Add to Shopping Bag")}
                  </button>
                  <button
                    onClick={() => { if (!isSignedIn) { navigate("/login"); return; } toggleWishlist(product.id, user?.id); }}
                    style={{ 
                      width: 64, height: 64, borderRadius: 20, border: "1px solid #e2e8f0", 
                      background: wishlistItems.includes(product.id) ? "#fef2f2" : "#fff",
                      color: wishlistItems.includes(product.id) ? "#ef4444" : "#94a3b8",
                      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
                    }}
                  >
                    <Heart size={28} fill={wishlistItems.includes(product.id) ? "#ef4444" : "none"} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <section style={{ marginTop: 100, paddingTop: 80, borderTop: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48 }}>
             <div>
               <p style={{ color: "#6366f1", fontWeight: 800, fontSize: "0.9rem", marginBottom: 12 }}>CUSTOMER VOICES</p>
               <h2 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#0f172a" }}>Ratings & Reviews</h2>
             </div>
             <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", padding: "12px 24px", borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
                <Star size={24} fill="#f59e0b" color="#f59e0b" />
                <span style={{ fontWeight: 900, fontSize: "1.5rem" }}>
                  {reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "0.0"}
                </span>
                <span style={{ color: "#94a3b8", fontWeight: 600 }}>/ 5.0</span>
             </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 80 }}>
            {/* Review List */}
            <div className="stack" style={{ gap: 32 }}>
              {reviews.length === 0 ? (
                <div style={{ padding: 60, background: "#fff", borderRadius: 40, textAlign: "center", border: "2px dashed #e2e8f0" }}>
                  <MessageSquare size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
                  <p style={{ color: "#64748b", fontWeight: 700, fontSize: "1.2rem" }}>No reviews yet. Share your thoughts!</p>
                </div>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} style={{ background: "#fff", padding: 32, borderRadius: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 16, background: "linear-gradient(135deg, #6366f1, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800 }}>
                          {r.users?.name?.[0] || "U"}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: "1.1rem", color: "#1e293b" }}>{r.users?.name || "Verified Buyer"}</p>
                          <p style={{ margin: 0, fontSize: "0.8rem", color: "#10b981", fontWeight: 700 }}>Verified Purchase</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={16} fill={i < r.rating ? "#f59e0b" : "none"} color={i < r.rating ? "#f59e0b" : "#e2e8f0"} />
                        ))}
                      </div>
                    </div>
                    <p style={{ margin: 0, color: "#475569", lineHeight: 1.8, fontSize: "1rem" }}>{r.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Submission Form */}
            <div style={{ position: "sticky", top: 130, alignSelf: "start" }}>
              <div style={{ background: "#fff", color: "#0f172a", padding: 40, borderRadius: 40, boxShadow: "0 20px 50px rgba(0,0,0,0.04)", border: "1px solid #f1f5f9" }}>
                {reviewSubmitted ? (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#f0fdf4", color: "#10b981", display: "grid", placeItems: "center", margin: "0 auto 24px" }}>
                      <Check size={40} />
                    </div>
                    <h3 style={{ fontSize: "1.75rem", fontWeight: 900, marginBottom: 12 }}>Thank You!</h3>
                    <p style={{ color: "#64748b", lineHeight: 1.6 }}>Your review has been successfully posted and is now helping the community.</p>
                    <button onClick={() => setReviewSubmitted(false)} style={{ marginTop: 32, background: "transparent", border: "1px solid #e2e8f0", padding: "12px 24px", borderRadius: 14, fontWeight: 700, cursor: "pointer", color: "#64748b" }}>Post Another</button>
                  </div>
                ) : (
                  <>
                    <h3 style={{ fontSize: "1.75rem", fontWeight: 900, marginBottom: 12, color: "#1e293b" }}>Leave a Review</h3>
                    <p style={{ color: "#64748b", fontSize: "0.95rem", marginBottom: 32, lineHeight: 1.6 }}>Share your experience and help others make informed decisions.</p>
                    
                    <div style={{ marginBottom: 32 }}>
                      <label style={{ display: "block", marginBottom: 16, fontSize: "0.85rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Overall Rating</label>
                      <div style={{ display: "flex", gap: 12 }}>
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            onClick={() => setReviewRating(num)}
                            style={{ 
                              width: 50, height: 50, borderRadius: 16, border: "none", 
                              background: reviewRating >= num ? "#ede9fe" : "#f8fafc",
                              cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center"
                            }}
                          >
                            <Star size={24} fill={reviewRating >= num ? "#6366f1" : "none"} color={reviewRating >= num ? "#6366f1" : "#cbd5e1"} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: 32 }}>
                      <label style={{ display: "block", marginBottom: 16, fontSize: "0.85rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Your Experience</label>
                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Tell us what you liked..."
                        style={{ 
                          width: "100%", height: 160, padding: 24, borderRadius: 24, 
                          background: "#f8fafc", border: "1px solid #f1f5f9", color: "#1e293b",
                          fontSize: "1rem", resize: "none", outline: "none", lineHeight: 1.6
                        }}
                      />
                    </div>

                    <button
                      onClick={handleSubmitReview}
                      disabled={submittingReview || !reviewText}
                      className="btn btn-primary"
                      style={{ width: "100%", padding: "20px", borderRadius: 20, fontSize: "1.1rem", fontWeight: 800, background: "#6366f1", border: "none", color: "#fff", cursor: "pointer", boxShadow: "0 10px 25px rgba(99, 102, 241, 0.2)" }}
                    >
                      {submittingReview ? <Loader2 size={24} className="spin" /> : "Post Review"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
