"use client";

import { useEffect, useState } from "react";

export default function EmployeeDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState("Not Checked In");
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch attendance stats
        const statsRes = await fetch("/api/attendance/stats");
        const statsData = await statsRes.json();
        if (statsRes.ok) {
          setStats(statsData);
          if (statsData.lastCheckInTime && !statsData.lastCheckOutTime) {
            setAttendanceStatus("Checked In");
          } else {
            setAttendanceStatus("Not Checked In");
          }
        }

        // Fetch company settings
        const settingsRes = await fetch("/api/admin/settings");
        const settingsData = await settingsRes.json();
        if (settingsRes.ok) {
          setSettings(settingsData);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    }
    fetchData();
  }, []);

  async function handleAttendance() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/attendance/check-in-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: attendanceStatus === "Checked In" ? "checkout" : "checkin",
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setAttendanceStatus(attendanceStatus === "Checked In" ? "Checked Out" : "Checked In");

        // Update stats after successful check-in/out
        const statsRes = await fetch("/api/attendance/stats");
        const statsData = await statsRes.json();
        if (statsRes.ok) {
          setStats(statsData);
        }
      } else {
        setError(data.error || "Failed to update attendance");
      }
    } catch (error) {
      console.error("Error updating attendance:", error);
      setError("An error occurred. Please try again.");
    }

    setLoading(false);
  }

  function isWithinWorkingHours() {
    if (!settings || !settings.workingHours) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHours, startMinutes] = settings.workingHours.start.split(":").map(Number);
    const [endHours, endMinutes] = settings.workingHours.end.split(":").map(Number);

    const startMinutesTotal = startHours * 60 + startMinutes;
    const endMinutesTotal = endHours * 60 + endMinutes;

    return currentTime >= startMinutesTotal && currentTime <= endMinutesTotal;
  }

  function formatTime(timeString) {
    if (!timeString) return "";

    const [hours, minutes] = timeString.split(":");
    let hour = parseInt(hours);
    let period = "AM";

    if (hour >= 12) {
      period = "PM";
      hour = hour === 12 ? 12 : hour - 12;
    }
    if (hour === 0) {
      hour = 12;
    }

    return `${hour}:${minutes} ${period}`;
  }

  const canCheckInOut = isWithinWorkingHours();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {stats ? (
        <>
          {/* Welcome Message */}
          <div className="bg-[#181818] text-[#EAEAEA] rounded-lg shadow-lg p-6 mb-6">
            <h1 className="text-2xl font-bold mb-2">Welcome, {stats.name}! 👋</h1>
            <p className="text-[#A7A7A7]">Role: {stats.role} | Company ID: {stats.companyId}</p>
          </div>

          {/* Working Hours Information */}
          <div className="bg-[#181818] text-[#EAEAEA] rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">Company Working Hours</h2>
            {settings && settings.workingHours ? (
              <p className="text-[#A7A7A7]">
                {formatTime(settings.workingHours.start)} - {formatTime(settings.workingHours.end)}
                {!canCheckInOut && attendanceStatus !== "Checked In" && (
                  <span className="block text-[#BB86FC] mt-2">You can only check in during working hours</span>
                )}
              </p>
            ) : (
              <p className="text-[#A7A7A7]">Loading working hours...</p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-[#181818] text-[#EAEAEA] rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Total Days Attended</h3>
              <p className="text-3xl font-bold text-[#BB86FC]">{stats.totalDaysAttended}</p>
            </div>
            <div className="bg-[#181818] text-[#EAEAEA] rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Last Check-In Time</h3>
              <p className="text-[#A7A7A7]">
                {stats.lastCheckInTime ? new Date(stats.lastCheckInTime).toLocaleString() : "No check-in yet"}
              </p>
            </div>
          </div>

          {/* Attendance Button */}
          <div className="bg-[#181818] text-[#EAEAEA] rounded-lg shadow-lg p-6">
            <button
              onClick={handleAttendance}
              disabled={loading || (attendanceStatus === "Not Checked In" && !canCheckInOut)}
              className={`w-full py-3 px-4 rounded-md font-medium transition-all ${
                loading
                  ? "bg-gray-600 cursor-not-allowed"
                  : attendanceStatus === "Checked In"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : canCheckInOut
                  ? "bg-[#BB86FC] hover:bg-[#9a67ea] text-white"
                  : "bg-gray-600 cursor-not-allowed"
              }`}
            >
              {loading ? "Processing..." : attendanceStatus === "Checked In" ? "Check Out" : "Check In"}
            </button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
            <p className="text-[#A7A7A7] mt-4">Status: {attendanceStatus}</p>
          </div>
        </>
      ) : (
        <div className="flex justify-center items-center h-64">
          <p className="text-xl text-[#BB86FC]">Loading...</p>
        </div>
      )}
    </div>
  );
}
