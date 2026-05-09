import { useParams, useNavigate } from "react-router-dom";
import { useProduct } from "../hooks/useProducts";
import { useCartStore } from "../store/cartStore";
import { useWishlistStore } from "../store/wishlistStore";
import { useUser } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import api from "../lib/api";
import { Navbar } from "../components/Navbar";
import { Star, Heart, Tag, Loader2 } from 'lucide-react';

interface Review {
  id: number;
  product_id: number;
  user_id: string;
  rating: number;
  text: string;
  created_at: string;
  users?: {
    name: string;
    avatar_url: string;
  };
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

  // Review Form State
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Time Utility
  const getTimeAgo = (dateStr: string) => {
    if (!dateStr) return "just now";
    const now = new Date();
    // Ensure UTC interpretation by appending Z if missing
    const past = new Date(dateStr.includes('T') ? (dateStr.endsWith('Z') ? dateStr : dateStr + 'Z') : dateStr.replace(' ', 'T') + 'Z');
    const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return past.toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
  };

  // Edit Mode State
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editRating, setEditRating] = useState(0);

  useEffect(() => {
    if (id) {
      api.get(`/api/reviews/product/${id}`).then((res) => setReviews(res.data)).catch(() => {});
    }
  }, [id]);

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
    if (!reviewText || reviewRating === 0) return;
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
      setReviewRating(0);
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

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm("Remove this review?")) return;
    try {
      await api.delete(`/api/reviews/${reviewId}`);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      if (editingReviewId === reviewId) setEditingReviewId(null);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleUpdateReview = async (reviewId: number) => {
    if (editRating === 0) { alert("Please select a rating"); return; }
    try {
      await api.put(`/api/reviews/${reviewId}`, {
        product_id: product.id,
        text: editText,
        rating: editRating
      });
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, text: editText, rating: editRating } : r));
      setEditingReviewId(null);
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  const startEditing = (review: Review) => {
    setEditingReviewId(review.id);
    setEditText(review.text);
    setEditRating(review.rating);
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", minHeight: "100vh" }}>
      <Navbar />
      
      <main className="page-section" style={{ maxWidth: 1200, margin: "0 auto", paddingTop: 80 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 48 }}>
          {/* Product Image - High-Density Style */}
          <div style={{ position: "sticky", top: 100, alignSelf: "start" }}>
            <div style={{ 
              borderRadius: 24, 
              overflow: "hidden", 
              background: "#f8fafc", 
              boxShadow: "0 10px 30px rgba(0,0,0,0.02)",
              border: "1px solid #f1f5f9"
            }}>
              <img 
                src={product.image_url} 
                alt={product.title} 
                style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }}
                onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.title)}&size=800&background=e0e7ff&color=6366f1&bold=true`; }}
              />
            </div>
          </div>

          {/* Product Details - Efficient Layout */}
          <div className="stack" style={{ gap: 20 }}>
            <div className="stack" style={{ gap: 6 }}>
              <div style={{ display: "flex", gap: 5 }}>
                <span style={{ height: 24, padding: "0 10px", borderRadius: 8, background: "#f1f5f9", color: "#64748b", fontWeight: 700, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{product.category}</span>
                {product.is_sale && <span style={{ height: 24, padding: "0 10px", borderRadius: 8, background: "#fef2f2", color: "#ef4444", fontWeight: 700, fontSize: "0.65rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}><Tag size={10} /> FLASH SALE</span>}
              </div>
              <h1 style={{ fontSize: "2.2rem", fontWeight: 800, color: "#1e293b", lineHeight: 1.1, letterSpacing: "-0.02em" }}>{product.title}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                 <div style={{ display: "flex", color: "#f59e0b" }}>
                   {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="currentColor" />)}
                 </div>
                 <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: "0.8rem" }}>{reviews.length} Verified Reviews</span>
              </div>
            </div>

            <p style={{ fontSize: "1rem", color: "#64748b", lineHeight: 1.5 }}>
              {product.description || "Experience the pinnacle of craftsmanship. This curated essential combines innovative design with premium materials for a truly exceptional daily companion."}
            </p>

            <div style={{ padding: 28, background: "#fff", borderRadius: 28, boxShadow: "0 10px 40px rgba(0,0,0,0.04)", border: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 24 }}>
                <span style={{ fontSize: "2.2rem", fontWeight: 800, color: "#1e293b", letterSpacing: "-0.03em" }}>₹{((product.price || 0) * quantity).toLocaleString()}</span>
                <span style={{ fontSize: "1.1rem", color: "#cbd5e1", textDecoration: "line-through", fontWeight: 600 }}>₹{(((product.price || 0) * 1.2) * quantity).toLocaleString()}</span>
              </div>

              <div className="stack" style={{ gap: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", background: "#f8fafc", padding: "4px", borderRadius: 14, border: "1px solid #e2e8f0" }}>
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ width: 40, height: 40, border: "none", background: "transparent", cursor: "pointer", fontWeight: 700, fontSize: "1.4rem", color: "#64748b", display: "grid", placeItems: "center", padding: 0 }}>
                      <span style={{ lineHeight: 0, marginTop: -4 }}>-</span>
                    </button>
                    <span style={{ minWidth: 40, textAlign: "center", fontWeight: 700, fontSize: "1.1rem", color: "#1e293b" }}>{quantity}</span>
                    <button onClick={() => setQuantity(Math.min(product.stock || 0, quantity + 1))} style={{ width: 40, height: 40, border: "none", background: "transparent", cursor: "pointer", fontWeight: 700, fontSize: "1.4rem", color: "#64748b", display: "grid", placeItems: "center", padding: 0 }}>
                      <span style={{ lineHeight: 0, marginTop: -2 }}>+</span>
                    </button>
                  </div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: (product.stock - quantity) < 5 ? "#ef4444" : "#10b981" }}>
                    {(product.stock - quantity)} Units Available
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={handleAddToCart}
                    disabled={(product.stock || 0) <= 0}
                    className="btn btn-primary"
                    style={{ 
                      flex: 1, padding: "18px", borderRadius: 20, fontSize: "1.1rem", fontWeight: 800, border: "none", 
                      boxShadow: (product.stock || 0) <= 0 ? "none" : "0 10px 25px rgba(99, 102, 241, 0.25)",
                      background: (product.stock || 0) <= 0 ? "#515151ff" : "linear-gradient(135deg, #2b2ff6ff 0%, #f2ac34ff 100%)",
                      cursor: (product.stock || 0) <= 0 ? "not-allowed" : "pointer"
                    }}
                  >
                    {(product.stock || 0) <= 0 ? "Sold Out" : (added ? "Success!" : (inCart ? "Update Bag" : "Add to Bag"))}
                  </button>
                  <button
                    onClick={() => { if (!isSignedIn) { navigate("/login"); return; } toggleWishlist(product.id, user?.id); }}
                    style={{ 
                      width: 60, height: 60, borderRadius: 20, border: "1px solid #f1f5f9", 
                      background: wishlistItems.includes(product.id) ? "#fef2f2" : "#fff",
                      color: wishlistItems.includes(product.id) ? "#ef4444" : "#cbd5e1",
                      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
                    }}
                  >
                    <Heart size={26} fill={wishlistItems.includes(product.id) ? "#ef4444" : "none"} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section - High-Density Framed Dashboard */}
        <section id="reviews" style={{ marginTop: 32, padding: 16, background: "#f8fafc", borderRadius: 20, border: "1px solid #f1f5f9", maxWidth: 1000, margin: "32px auto" }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#111827", margin: 0 }}>Community Feedback</h2>
              <span style={{ fontSize: "0.8rem", color: "#9ca3af", fontWeight: 600 }}>{reviews.length} Verified Reviews</span>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 24, alignItems: "start", marginBottom: 24, background: "#fff", padding: 20, borderRadius: 16, border: "1px solid #f1f5f9" }}>
              {/* Dashboard Left */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "3.2rem", fontWeight: 800, color: "#111827", lineHeight: 1 }}>
                  {reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : "0.0"}
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 3, margin: "10px 0 2px" }}>
                  {[1,2,3,4,5].map(i => (
                    <Star 
                      key={i} 
                      size={16} 
                      fill={i <= Math.round(reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)) ? "#8b5cf6" : "none"} 
                      color="#8b5cf6"
                      strokeWidth={2}
                    />
                  ))}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#9ca3af", fontWeight: 600 }}>Rating Average</div>
              </div>

              {/* Dashboard Right: Distribution */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[5,4,3,2,1].map(star => {
                  const count = reviews.filter(r => r.rating === star).length;
                  const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={star} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "#8b5cf6", borderRadius: 3 }} />
                      </div>
                      <div style={{ display: "flex", gap: 8, minWidth: 100, fontSize: "0.8rem", fontWeight: 600 }}>
                        <span style={{ color: "#111827" }}>{star}.0</span>
                        <span style={{ color: "#9ca3af" }}>{count.toLocaleString()} opinions</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

             {/* Persistent Write Review Box */}
             <div style={{ display: "flex", gap: 16, marginBottom: 32, background: "#fff", padding: "20px", borderRadius: 12, border: "1px solid #f1f5f9" }}>
               <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "0.95rem", flexShrink: 0, overflow: "hidden" }}>
                  {user?.imageUrl ? <img src={user.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (user?.firstName?.[0] || "U")}
               </div>
               <div style={{ flex: 1 }}>
                 <textarea
                   placeholder="Share your thoughts on this product..."
                   value={reviewText}
                   onChange={(e) => { setReviewText(e.target.value); setReviewSubmitted(false); }}
                   style={{ 
                     width: "100%", background: "transparent", border: "none", outline: "none", 
                     fontSize: "1rem", color: "#111827", resize: "none", minHeight: 36, fontFamily: "inherit", fontWeight: 500, borderBottom: "1px solid #f3f4f6", marginBottom: 12
                   }}
                   onFocus={(e) => (e.currentTarget.style.borderBottom = "1px solid #8b5cf6")}
                   onBlur={(e) => (e.currentTarget.style.borderBottom = "1px solid #f3f4f6")}
                 />
                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 2 }}>
                        {[1,2,3,4,5].map(num => (
                          <button key={num} onClick={() => setReviewRating(num)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "2px" }}>
                            <Star size={20} fill={reviewRating >= num ? "#8b5cf6" : "none"} color="#8b5cf6" strokeWidth={2} />
                          </button>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {reviewSubmitted && <span style={{ color: "#10b981", fontWeight: 800, fontSize: "0.8rem" }}>Posted!</span>}
                      <button 
                        onClick={handleSubmitReview}
                        disabled={!reviewText || reviewRating === 0 || submittingReview}
                        style={{ 
                          background: "#111827", color: "#fff", padding: "8px 20px", borderRadius: 8, border: "none", 
                          fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", opacity: (!reviewText || reviewRating === 0) ? 0.3 : 1 
                        }}
                      >
                        {submittingReview ? "Syncing..." : "Post Review"}
                      </button>
                    </div>
                 </div>
               </div>
             </div>

             {/* Real-time Community Feed */}
             <div className="stack" style={{ gap: 16 }}>
                {[...reviews].sort((a, b) => {
                  if (a.user_id === user?.id && b.user_id !== user?.id) return -1;
                  if (a.user_id !== user?.id && b.user_id === user?.id) return 1;
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                }).map((r) => (
                  <div key={r.id} style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #f1f5f9" }}>
                    {/* User Info Row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          {r.users?.avatar_url ? <img src={r.users.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (r.users?.name?.[0] || "U")}
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                          <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#111827" }}>{r.users?.name || "Verified Customer"}</span>
                          <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 500 }}>{getTimeAgo(r.created_at)}</span>
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 800, color: "#111827", fontSize: "0.9rem" }}>{r.rating}.0</span>
                        <div style={{ display: "flex", gap: 2 }}>
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={14} fill={i < r.rating ? "#8b5cf6" : "none"} color="#8b5cf6" strokeWidth={2} />
                          ))}
                        </div>
                        {r.user_id === user?.id && (
                          <div style={{ marginLeft: 8, display: "flex", gap: 8 }}>
                             <button onClick={() => startEditing(r)} style={{ background: "none", border: "none", color: "#8b5cf6", fontWeight: 800, cursor: "pointer", fontSize: "0.75rem" }}>Edit</button>
                             <button onClick={() => handleDeleteReview(r.id)} style={{ background: "none", border: "none", color: "#ef4444", fontWeight: 800, cursor: "pointer", fontSize: "0.75rem" }}>Delete</button>
                          </div>
                        )}
                      </div>
                    </div>

                    {editingReviewId === r.id ? (
                      <div style={{ background: "#f9fafb", padding: 16, borderRadius: 10 }}>
                         <textarea 
                           value={editText}
                           onChange={(e) => setEditText(e.target.value)}
                           style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #8b5cf6", fontSize: "0.95rem", padding: "4px 0", marginBottom: 8, fontFamily: "inherit" }}
                         />
                         <div style={{ display: "flex", gap: 8 }}>
                           <button onClick={() => handleUpdateReview(r.id)} style={{ background: "#111827", color: "#fff", border: "none", padding: "4px 16px", borderRadius: 6, fontWeight: 700, cursor: "pointer" }}>Save</button>
                           <button onClick={() => setEditingReviewId(null)} style={{ background: "none", border: "none", color: "#6b7280", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                         </div>
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: "0.95rem", color: "#4b5563", lineHeight: 1.4, fontWeight: 500 }}>
                        {r.text}
                      </p>
                    )}
                  </div>
                ))}
             </div>
          </div>
        </section>
      </main>
    </div>
  );
}
