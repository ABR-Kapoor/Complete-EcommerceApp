import { useState } from "react";
import api from "../lib/api";

export const useAuthService = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginWithOTP = async (phone: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/auth/send-otp", { phone });
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to send OTP";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (phone: string, otp: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/auth/verify-otp", { phone, otp });
      localStorage.setItem("auth_token", response.data.token);
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to verify OTP";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loginWithOTP, verifyOTP, loading, error };
};
