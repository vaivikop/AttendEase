"use client";

import { useEffect, useState } from "react";

export default function EmployeeDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/attendance/stats");
        const data = await res.json();
        if (res.ok) setStats(data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center px-6">
      {stats ? (
        <>
          {/* Welcome Message */}
          <div className="text-center animate-fadeIn">
            <h1 className="text-3xl md:text-4xl font-bold text-purple-500">
              Welcome, {stats.name}! 👋
            </h1>
            <p className="text-gray-400 mt-2">
              Role: <span className="text-purple-400">{stats.role}</span> | Company ID: <span className="text-purple-400">{stats.companyId}</span>
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 max-w-3xl w-full">
            {/* Total Days Attended */}
            <div className="p-6 bg-gray-800 rounded-lg shadow-lg transform hover:scale-105 transition duration-300">
              <h3 className="text-xl font-semibold text-purple-400">Total Days Attended</h3>
              <p className="text-gray-300 text-3xl font-bold mt-2">{stats.totalDaysAttended}</p>
            </div>

            {/* Last Check-In Time */}
            <div className="p-6 bg-gray-800 rounded-lg shadow-lg transform hover:scale-105 transition duration-300">
              <h3 className="text-xl font-semibold text-purple-400">Last Check-In Time</h3>
              <p className="text-gray-300 mt-2">
                {stats.lastCheckInTime ? new Date(stats.lastCheckInTime).toLocaleString() : "No check-in yet"}
              </p>
            </div>
          </div>
        </>
      ) : (
        <p className="text-gray-400">Loading...</p>
      )}
    </div>
  );
}
