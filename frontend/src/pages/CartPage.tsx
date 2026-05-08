import { useCartStore } from "../store/cartStore";
import { useNavigate } from "react-router-dom";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const total = useCartStore((state) => state.total());
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="empty-state page-section">
        <div className="stack" style={{ placeItems: "center" }}>
          <p className="empty-title">Your cart is empty</p>
          <p className="empty-copy">Load it up with something sharp.</p>
          <button onClick={() => navigate("/")} className="btn btn-primary">Continue shopping</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-section">
        <p className="panel-copy">Cart</p>
        <h1 className="section-title">Shopping cart</h1>
      </div>

      <div className="cart-grid">
        <section className="card">
          <div className="cart-list">
            {items.map((item) => (
              <article key={item.id} className="cart-item">
                <div className="cart-thumb">
                  <img src={item.image_url} alt={item.title} />
                </div>
                <div className="cart-meta">
                  <div className="row-between">
                    <div>
                      <h3 className="card-title" style={{ fontSize: "1.15rem" }}>{item.title}</h3>
                      <p className="muted">₹{item.price}</p>
                    </div>
                    <strong className="price" style={{ fontSize: "1.15rem" }}>₹{(item.price * item.quantity).toFixed(2)}</strong>
                  </div>
                  <div className="row-between">
                    <div className="quantity-control">
                      <button className="btn btn-ghost btn-icon" onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}>−</button>
                      <input type="number" min="1" value={item.quantity} onChange={(e) => updateQuantity(item.id, Math.max(1, Number(e.target.value)))} />
                      <button className="btn btn-ghost btn-icon" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="btn btn-danger">Remove</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="summary-card">
          <p className="panel-copy">Summary</p>
          <h2 className="panel-title">Your total</h2>
          <div className="stack">
            <div className="summary-row"><span className="muted">Subtotal</span><strong>₹{total.toFixed(2)}</strong></div>
            <div className="summary-row"><span className="muted">Shipping</span><strong>Free</strong></div>
            <div className="summary-row"><span className="muted">Estimated total</span><strong>₹{total.toFixed(2)}</strong></div>
          </div>
          <button onClick={() => navigate("/checkout")} className="btn btn-primary" style={{ width: "100%", marginTop: 18 }}>
            Proceed to checkout
          </button>
        </aside>
      </div>
    </div>
  );
}
