import { useNavigate, useParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Check } from "lucide-react";

export const OrderSuccess = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: "Inter, sans-serif", minHeight: "100vh", background: "#f8fafc" }}>
      <Navbar />
      <div style={{ display: "grid", placeItems: "center", paddingTop: 80 }}>
        <div className="empty-state" style={{ maxWidth: 500, padding: 40, background: "#fff", borderRadius: 32, boxShadow: "0 20px 50px rgba(0,0,0,0.05)" }}>
          <div className="stack" style={{ placeItems: "center" }}>
            <div className="brand-mark" style={{ 
              width: 100, height: 100, marginBottom: 32, 
              background: "linear-gradient(135deg, #10b981, #059669)", 
              color: "#fff", display: "grid", placeItems: "center", borderRadius: "50%",
              boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)"
            }}>
              <Check size={48} strokeWidth={3} />
            </div>
            
            <p className="panel-copy" style={{ color: "#10b981", fontWeight: 700, marginBottom: 8, letterSpacing: "0.05em" }}>Payment Confirmed</p>
            <h1 className="empty-title" style={{ fontSize: "2.2rem", fontWeight: 800, marginBottom: 16 }}>Order Placed!</h1>
            
            <p className="empty-copy" style={{ color: "#64748b", fontSize: "1.05rem", lineHeight: 1.6, textAlign: "center" }}>
              Success! Your order <strong style={{ color: "#1e293b" }}>#{id}</strong> has been received and is now being processed by our team.
            </p>
            
            <div style={{ marginTop: 40, display: "grid", gap: 12, width: "100%" }}>
              <button 
                onClick={() => navigate("/orders")} 
                className="btn btn-primary" 
                style={{ padding: "16px", borderRadius: 16, fontSize: "1rem", fontWeight: 600 }}
              >
                Track Order Status
              </button>
              <button 
                onClick={() => navigate("/")} 
                className="btn btn-ghost"
                style={{ padding: "16px", borderRadius: 16, fontSize: "1rem", fontWeight: 600 }}
              >
                Back to Catalog
              </button>
            </div>
            
            <p className="muted" style={{ marginTop: 32, fontSize: "0.85rem" }}>
              A confirmation email has been sent to your registered address.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
