import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

export const Login = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+91${phone}`,
      });
      if (error) throw error;
      setStep(2);
    } catch (err) {
      console.error("OTP send failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: `+91${phone}`,
        token: otp,
        type: "sms",
      });
      if (error) throw error;

      const user = data.user;
      setUser({
        id: user.id,
        email: user.email || "",
        phone: user.phone || "",
        name: user.user_metadata?.name || "User",
        avatar_url: user.user_metadata?.avatar_url,
        role: user.user_metadata?.role || "user",
      });

      navigate("/");
    } catch (err) {
      console.error("OTP verify failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded shadow p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">ShopHub</h1>

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <h2 className="text-xl font-bold mb-4">Login with OTP</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <div className="flex gap-2">
                <span className="px-3 py-2 bg-gray-100 rounded">+91</span>
                <input
                  type="tel"
                  placeholder="10 digit number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.slice(0, 10))}
                  maxLength={10}
                  className="flex-1 px-4 py-2 border rounded"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || phone.length !== 10}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-bold disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <h2 className="text-xl font-bold mb-4">Enter OTP</h2>
            <p className="text-gray-600 text-sm mb-4">OTP sent to +91{phone}</p>
            <div>
              <label className="block text-sm font-medium mb-2">OTP</label>
              <input
                type="text"
                placeholder="6 digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                maxLength={6}
                className="w-full px-4 py-2 border rounded text-center tracking-widest"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-bold disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setOtp("");
              }}
              className="w-full text-blue-600 hover:text-blue-800 py-2 font-medium"
            >
              Change Phone
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
