"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { FaUser, FaEnvelope, FaBuilding } from "react-icons/fa";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [user, setUser] = useState({
    name: "",
    email: "",
    companyId: "",
  });
  const [loading, setLoading] = useState(false);
  const [editingField, setEditingField] = useState(null);

  useEffect(() => {
    if (session?.user) {
      fetchUserProfile();
    }
  }, [session]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();

      if (res.ok) {
        setUser({
          name: data.name || "",
          email: data.email || "",
          companyId: data.companyId || "N/A",
        });
      } else {
        toast.error("Failed to fetch profile data.");
      }
    } catch (error) {
      console.error("Fetch profile error:", error);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (editingField !== "name") {
      toast.error("Only name can be updated.");
      setLoading(false);
      return;
    }

    if (!user.name.trim()) {
      toast.error("Name cannot be empty.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        toast.success("Profile updated successfully!");
        await update({ user: { ...session.user, name: user.name } });
        setEditingField(null);
      } else {
        toast.error(data.error || "Failed to update profile.");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white px-4">
      <div className="w-full max-w-sm bg-gray-800 p-5 rounded-lg shadow-md transition-transform hover:scale-[1.02] sm:max-w-md">
        <h2 className="text-2xl font-bold text-center text-purple-400 mb-3">My Profile</h2>

        <form onSubmit={handleUpdate} className="space-y-5">
          {/* Name */}
          <div className="relative group">
            <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              className="w-full pl-10 pr-3 py-2 rounded bg-gray-700 focus:ring-2 focus:ring-purple-500 cursor-pointer text-sm"
              value={user.name}
              readOnly={editingField !== "name"}
              onClick={() => setEditingField("name")}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
            />
            {editingField !== "name" && (
              <p className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                Tap to edit
              </p>
            )}
          </div>

          {/* Email (Read-only) */}
          <div className="relative opacity-80 cursor-not-allowed">
            <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="email"
              className="w-full pl-10 pr-3 py-2 rounded bg-gray-700 text-sm cursor-not-allowed"
              value={user.email}
              disabled
            />
          </div>

          {/* Company ID (Read-only) */}
          <div className="relative opacity-80 cursor-not-allowed">
            <FaBuilding className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              className="w-full pl-10 pr-3 py-2 rounded bg-gray-700 text-sm cursor-not-allowed"
              value={user.companyId}
              disabled
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm transition-all"
          >
            {loading ? "Updating..." : "Update Name"}
          </button>
        </form>
      </div>
    </div>
  );
}
