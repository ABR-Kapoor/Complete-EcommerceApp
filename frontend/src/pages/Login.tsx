import { SignIn } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";

export const Login = () => {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate("/");
    }
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <div className="auth-shell">
      <div className="auth-grid">
        <section className="auth-hero">
          <div className="hero-kicker" style={{ marginBottom: 24 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
            Secure access · ABR Ecommerce
          </div>
          <h1>Shop smarter. Delivered faster.</h1>
          <p>
            Sign in to access your cart, wishlist, and order history. ABR Ecommerce — built for people who love great products.
          </p>
          <div className="auth-points">
            <div className="auth-point"><span className="auth-dot" />Instant access to 100+ curated products</div>
            <div className="auth-point"><span className="auth-dot" />Real-time order tracking and updates</div>
            <div className="auth-point"><span className="auth-dot" />Secure checkout with COD & Razorpay</div>
            <div className="auth-point"><span className="auth-dot" />Personal wishlist and review system</div>
          </div>
        </section>

        <section className="auth-card">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div className="brand-mark" style={{ width: 36, height: 36, fontSize: "1.1rem" }}>A</div>
              <span className="otp-chip">ABR Ecommerce</span>
            </div>
            <h2 className="auth-title">Sign in to your account</h2>
            <p className="muted" style={{ fontSize: "0.9rem", marginBottom: 20 }}>Welcome back. Sign in below to continue shopping.</p>
          </div>
          <SignIn />
        </section>
      </div>
    </div>
  );
};
