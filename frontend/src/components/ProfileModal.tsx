import { useState, useEffect, useRef } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../store/userStore";
import { User as UserIcon, Mail, Phone, CreditCard, MapPin, Package, Zap, LogOut, X } from "lucide-react";

interface ProfileModalProps {
  onClose: () => void;
}

const ADMIN_EMAIL = "abrmkprm@gmail.com";

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const { profile, setProfile, fetchProfile } = useUserStore();

  const [name, setName] = useState(profile?.name || user?.fullName || user?.firstName || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [paymentMethod, setPaymentMethod] = useState<string>(user?.unsafeMetadata?.paymentMethod as string || "COD");
  const [address, setAddress] = useState({ street: "", city: "", state: "", zip_code: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isAdmin = user?.emailAddresses?.some(e => e.emailAddress === ADMIN_EMAIL);

  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setPhone(profile.phone || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    // Fetch saved address
    api.get(`/api/users/${user.id}/address`).then(res => {
      if (res.data) setAddress(res.data);
    }).catch(() => {});
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // 1. Sync to our local database (Primary Source of Truth)
      const updates = { name, phone, email: user.primaryEmailAddress?.emailAddress };
      await api.put(`/api/users/${user.id}`, updates);
      
      // Update local store immediately
      if (profile) {
        setProfile({ ...profile, ...updates });
      } else {
        await fetchProfile(user.id);
      }

      // 2. Update Clerk user (Fallback/Sync)
      await user.update({
        firstName: name.split(" ")[0] || "",
        lastName: name.split(" ").slice(1).join(" ") || "",
        unsafeMetadata: { ...user.unsafeMetadata, paymentMethod }
      });
      
      await user.reload();

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Save profile error:", e);
    }
    setSaving(false);
  };

  const handleSaveAddress = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await api.post("/api/orders/save-address", { user_id: user.id, ...address });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
        padding: "80px 24px 24px"
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass" style={{
        width: 900,
        borderRadius: 40,
        boxShadow: "0 40px 100px rgba(0,0,0,0.25)",
        fontFamily: "'Inter', sans-serif",
        animation: "slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.4)"
      }}>
        <div style={{ padding: "48px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ position: "relative" }}>
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt="avatar" style={{ width: 90, height: 90, borderRadius: 32, objectFit: "cover", border: "4px solid #fff", boxShadow: "0 10px 30px rgba(99,102,241,0.2)" }} />
                ) : (
                  <div style={{
                    width: 90, height: 90, borderRadius: 32,
                    background: "linear-gradient(135deg, #6366f1, #06b6d4)",
                    display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: "2rem"
                  }}>{(profile?.name || user?.firstName || "U")[0]}</div>
                )}
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, background: "#10b981", borderRadius: "50%", border: "4px solid #fff" }} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "2rem", fontWeight: 900, color: "#0f172a", fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}>
                  {profile?.name || user?.fullName || "Store Member"}
                </h2>
                <div style={{ color: "#64748b", fontSize: "1rem", fontWeight: 600 }}>{user?.primaryEmailAddress?.emailAddress}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ border: "none", background: "#f1f5f9", borderRadius: 16, width: 44, height: 44, cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, transition: "all 0.2s" }}>
              <X size={22} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
            {/* Left Column: Personal Identity */}
            <div className="stack" style={{ gap: 32 }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                  <UserIcon size={20} color="#6366f1" /> Personal Identity
                </h3>
                <div className="stack" style={{ gap: 20 }}>
                  <div className="field">
                    <label className="label" style={{ fontWeight: 800, fontSize: "0.8rem", color: "#475569", letterSpacing: "0.05em" }}>FULL LEGAL NAME</label>
                    <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" style={{ borderRadius: 16, padding: "14px 20px", background: "#fff", border: "1px solid #e2e8f0", color: "#1e293b" }} />
                  </div>
                  <div className="field">
                    <label className="label" style={{ fontWeight: 800, fontSize: "0.8rem", color: "#475569", letterSpacing: "0.05em" }}>PRIMARY PHONE</label>
                    <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91..." style={{ borderRadius: 16, padding: "14px 20px", background: "#fff", border: "1px solid #e2e8f0", color: "#1e293b" }} />
                  </div>
                  <div className="field">
                    <label className="label" style={{ fontWeight: 700, fontSize: "0.8rem", color: "#475569", letterSpacing: "0.02em", marginBottom: 12 }}>Preferred Payment</label>
                    <div style={{ display: "flex", gap: 10, background: "#f1f5f9", padding: 6, borderRadius: 14 }}>
                      {[
                        { value: "COD", label: "Cash on Delivery" },
                        { value: "Razorpay", label: "Online Payment" }
                      ].map(opt => (
                        <button 
                          key={opt.value}
                          type="button"
                          onClick={() => setPaymentMethod(opt.value)}
                          style={{
                            flex: 1, padding: "10px", borderRadius: 10, border: "none",
                            cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
                            background: paymentMethod === opt.value ? "#fff" : "transparent",
                            color: paymentMethod === opt.value ? "#6366f1" : "#64748b",
                            boxShadow: paymentMethod === opt.value ? "0 4px 10px rgba(0,0,0,0.05)" : "none",
                            transition: "all 0.2s"
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <button
                className={`btn ${saved ? "btn-emerald" : "btn-primary"}`}
                onClick={handleSave}
                disabled={saving}
                style={{ 
                  padding: "16px", borderRadius: 16, fontWeight: 600, fontSize: "1rem", 
                  background: saved ? "#10b981" : "linear-gradient(135deg, #6366f1, #4f46e5)"
                }}
              >
                {saving ? <Loader2 className="spin" size={24} /> : saved ? "Identity Updated" : "Update Identity"}
              </button>
            </div>

            {/* Right Column: Logistics Hub */}
            <div className="stack" style={{ gap: 32 }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                  <MapPin size={20} color="#06b6d4" /> Shipping Logistics
                </h3>
                <div className="stack" style={{ gap: 20 }}>
                  <div className="field">
                    <label className="label" style={{ fontWeight: 800, fontSize: "0.8rem", color: "#475569", letterSpacing: "0.05em" }}>STREET ADDRESS</label>
                    <input className="input" value={address.street} onChange={e => setAddress(a => ({ ...a, street: e.target.value }))} placeholder="123 Main St" style={{ borderRadius: 16, padding: "14px 20px", background: "#fff", border: "1px solid #e2e8f0", color: "#1e293b" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div className="field">
                      <label className="label" style={{ fontWeight: 800, fontSize: "0.8rem", color: "#475569", letterSpacing: "0.05em" }}>CITY</label>
                      <input className="input" value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} placeholder="City" style={{ borderRadius: 16, background: "#fff", border: "1px solid #e2e8f0", color: "#1e293b" }} />
                    </div>
                    <div className="field">
                      <label className="label" style={{ fontWeight: 800, fontSize: "0.8rem", color: "#475569", letterSpacing: "0.05em" }}>STATE</label>
                      <input className="input" value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))} placeholder="State" style={{ borderRadius: 16, background: "#fff", border: "1px solid #e2e8f0", color: "#1e293b" }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div className="field">
                      <label className="label" style={{ fontWeight: 800, fontSize: "0.8rem", color: "#475569", letterSpacing: "0.05em" }}>ZIP CODE</label>
                      <input className="input" value={address.zip_code} onChange={e => setAddress(a => ({ ...a, zip_code: e.target.value }))} placeholder="Zip" style={{ borderRadius: 16, background: "#fff", border: "1px solid #e2e8f0", color: "#1e293b" }} />
                    </div>
                    <div className="field">
                      <label className="label" style={{ fontWeight: 800, fontSize: "0.8rem", color: "#475569", letterSpacing: "0.05em" }}>LOGISTICS PHONE</label>
                      <input className="input" value={address.phone} onChange={e => setAddress(a => ({ ...a, phone: e.target.value }))} placeholder="Phone" style={{ borderRadius: 16, background: "#fff", border: "1px solid #e2e8f0", color: "#1e293b" }} />
                    </div>
                  </div>
                </div>
              </div>
              <button
                className={`btn ${saved ? "btn-emerald" : "btn-primary"}`}
                onClick={handleSaveAddress}
                disabled={saving}
                style={{ 
                  padding: "16px", borderRadius: 16, fontWeight: 600, fontSize: "1rem",
                  background: saved ? "#10b981" : "linear-gradient(135deg, #6366f1, #4f46e5)"
                }}
              >
                {saving ? <Loader2 className="spin" size={24} /> : saved ? "Address Saved" : "Save Address Details"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 40, paddingTop: 32, borderTop: "1px solid rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => { onClose(); navigate("/orders"); }} className="btn" style={{ background: "#0f172a", color: "#fff", padding: "12px 24px", borderRadius: 14, display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: "0.95rem" }}>
                <Package size={18} /> My Orders
              </button>
              {isAdmin && (
                <button onClick={() => { navigate("/admin"); onClose(); }} className="btn" style={{ background: "#6366f1", color: "#fff", padding: "12px 24px", borderRadius: 14, display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: "0.95rem" }}>
                  <Zap size={18} fill="currentColor" /> Admin Panel
                </button>
              )}
            </div>
            <button onClick={() => signOut()} className="btn" style={{ background: "transparent", color: "#ef4444", fontWeight: 600, display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 12, fontSize: "0.95rem" }}>
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
