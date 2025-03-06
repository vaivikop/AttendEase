"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [user, setUser] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const router = useRouter();

  const validateForm = () => {
    let tempErrors = {};
    if (!user.email) tempErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(user.email)) tempErrors.email = "Invalid email";

    if (!user.password) tempErrors.password = "Password is required";
    else if (user.password.length < 6) tempErrors.password = "Must be at least 6 characters";

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const result = await signIn("credentials", { 
      email: user.email, 
      password: user.password, 
      redirect: false 
    });

    if (result?.error) {
      toast.error("Invalid email or password!");
    } else {
      toast.success("Login successful!");
      router.push("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white px-4">
      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center text-purple-400">AttendEase Login</h2>
        <p className="text-gray-400 text-center mt-2">Securely log in to your account</p>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              className={`w-full px-4 py-2 rounded bg-gray-700 focus:outline-none ${
                errors.email ? "border border-red-500" : "focus:ring-2 focus:ring-purple-500"
              }`}
              value={user.email}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
            />
            {errors.email && <p className="text-red-400 text-sm">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              className={`w-full px-4 py-2 rounded bg-gray-700 focus:outline-none ${
                errors.password ? "border border-red-500" : "focus:ring-2 focus:ring-purple-500"
              }`}
              value={user.password}
              onChange={(e) => setUser({ ...user, password: e.target.value })}
            />
            {errors.password && <p className="text-red-400 text-sm">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-all"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-sm text-center text-gray-400 mt-4">
          Don't have an account?{" "}
          <a href="/register" className="text-purple-400 hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
