"use client";

import { useEffect, useState } from "react";

export default function EmployeeDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState("Not Checked In");

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/attendance/stats");
        const data = await res.json();
        if (res.ok) {
          setStats(data);
          if (data.lastCheckInTime && !data.lastCheckOutTime) {
            setAttendanceStatus("Checked In");
          } else {
            setAttendanceStatus("Not Checked In");
          }
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    }
    fetchStats();
  }, []);

  async function handleAttendance() {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/check-in", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        if (data.attendance.checkOutTime) {
          setAttendanceStatus("Checked Out");
        } else {
          setAttendanceStatus("Checked In");
        }
      }
    } catch (error) {
      console.error("Error updating attendance:", error);
    }
    setLoading(false);
  }

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
              Role: <span className="text-purple-400">{stats.role}</span> | Company ID:{" "}
              <span className="text-purple-400">{stats.companyId}</span>
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 max-w-3xl w-full">
            <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-purple-400">Total Days Attended</h3>
              <p className="text-gray-300 text-3xl font-bold mt-2">{stats.totalDaysAttended}</p>
            </div>
            <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-purple-400">Last Check-In Time</h3>
              <p className="text-gray-300 mt-2">
                {stats.lastCheckInTime ? new Date(stats.lastCheckInTime).toLocaleString() : "No check-in yet"}
              </p>
            </div>
          </div>

          {/* Attendance Button */}
          <div className="mt-6">
            <button
              onClick={handleAttendance}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                attendanceStatus === "Checked In" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
              }`}
              disabled={loading}
            >
              {loading ? "Processing..." : attendanceStatus === "Checked In" ? "Check Out" : "Check In"}
            </button>
            <p className="text-gray-400 mt-2">Status: {attendanceStatus}</p>
          </div>
        </>
      ) : (
        <p className="text-gray-400">Loading...</p>
      )}
    </div>
  );
}
