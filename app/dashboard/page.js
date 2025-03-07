"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import AdminDashboard from "./admin";
import EmployeeDashboard from "./employee";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [role, setRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";

    if (isLocal) {
      setRole("admin"); // Auto-set role in local environment
      return;
    }

    if (status === "authenticated") {
      fetchUserRole();
    } else if (status === "unauthenticated") {
      router.push("/login"); // Redirect if not logged in
    }
  }, [status, router]);

  const fetchUserRole = async () => {
    try {
      const res = await fetch("/api/user");
      const data = await res.json();

      if (res.ok) {
        setRole(data.role);
      } else {
        console.error("Failed to fetch user role:", data.error);
      }
    } catch (error) {
      console.error("Error fetching role:", error);
    }
  };

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      {role === "admin" ? <AdminDashboard /> : <EmployeeDashboard />}
    </div>
  );
}
