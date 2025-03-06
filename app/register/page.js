"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [user, setUser] = useState({
    email: "",
    password: "",
    role: "employee",
    companyName: "",
    companyId: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const router = useRouter();

  useEffect(() => {
    if (user.role === "admin") {
      setUser((prev) => ({ ...prev, companyId: "" })); // Reset companyId if admin
    } else {
      setUser((prev) => ({ ...prev, companyName: "" })); // Reset companyName if employee
    }
  }, [user.role]);

  const validateForm = () => {
    let tempErrors = {};
    if (!user.email) tempErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(user.email)) tempErrors.email = "Invalid email";

    if (!user.password) tempErrors.password = "Password is required";
    else if (user.password.length < 6) tempErrors.password = "Must be at least 6 characters";

    if (user.role === "admin" && !user.companyName) tempErrors.companyName = "Company name is required";
    if (user.role === "employee" && !user.companyId) tempErrors.companyId = "Company ID is required";

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });

    const data = await response.json();
    if (response.ok) {
      toast.success("Registration successful! Redirecting...");
      setTimeout(() => router.push("/login"), 2000);
    } else {
      toast.error(data.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-4">
      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center text-purple-400">Register</h2>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-4 py-2 rounded bg-gray-700 focus:ring-2 focus:ring-purple-500"
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
              className="w-full px-4 py-2 rounded bg-gray-700 focus:ring-2 focus:ring-purple-500"
              value={user.password}
              onChange={(e) => setUser({ ...user, password: e.target.value })}
            />
            {errors.password && <p className="text-red-400 text-sm">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Role</label>
            <select
              className="w-full px-4 py-2 rounded bg-gray-700 text-white focus:ring-2 focus:ring-purple-500"
              value={user.role}
              onChange={(e) => setUser({ ...user, role: e.target.value })}
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {user.role === "admin" && (
            <div>
              <label className="block text-sm font-medium text-gray-300">Company Name</label>
              <input
                type="text"
                placeholder="Enter company name"
                className="w-full px-4 py-2 rounded bg-gray-700 focus:ring-2 focus:ring-purple-500"
                value={user.companyName}
                onChange={(e) => setUser({ ...user, companyName: e.target.value })}
              />
              {errors.companyName && <p className="text-red-400 text-sm">{errors.companyName}</p>}
            </div>
          )}

          {user.role === "employee" && (
            <div>
              <label className="block text-sm font-medium text-gray-300">Company ID</label>
              <input
                type="text"
                placeholder="Enter company ID"
                className="w-full px-4 py-2 rounded bg-gray-700 focus:ring-2 focus:ring-purple-500"
                value={user.companyId}
                onChange={(e) => setUser({ ...user, companyId: e.target.value })}
              />
              {errors.companyId && <p className="text-red-400 text-sm">{errors.companyId}</p>}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-all"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="text-sm text-center text-gray-400 mt-4">
          Already have an account?{" "}
          <a href="/login" className="text-purple-400 hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
