"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";

export default function EmployeeDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState("Not Checked In");
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("office");
  const [currentSessionTime, setCurrentSessionTime] = useState(0);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  useEffect(() => {
    let timer;
    if (stats && stats.isCheckedIn) {
      timer = setInterval(() => {
        const startTime = new Date(stats.currentSession.startTime);
        const duration = Math.floor((new Date() - startTime) / (1000 * 60));
        setCurrentSessionTime(duration);
      }, 60000);
      
      if (stats.currentSession) {
        setCurrentSessionTime(stats.currentSession.duration);
      }
    }
    
    return () => clearInterval(timer);
  }, [stats]);

  async function fetchData() {
    setLoading(true);
    try {
      const statsRes = await fetch(`/api/attendance/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      const statsData = await statsRes.json();
      if (statsRes.ok) {
        setStats(statsData);
        setAttendanceStatus(statsData.isCheckedIn ? "Checked In" : "Not Checked In");
      }

      const settingsRes = await fetch("/api/admin/settings");
      const settingsData = await settingsRes.json();
      if (settingsRes.ok) {
        setSettings(settingsData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setError("Failed to load data. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAttendance() {
    setActionLoading(true);
    setError("");

    try {
      const res = await fetch("/api/attendance/check-in-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: attendanceStatus === "Checked In" ? "checkout" : "checkin",
          location,
          notes
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setAttendanceStatus(attendanceStatus === "Checked In" ? "Not Checked In" : "Checked In");
        setNotes("");
        
        if (data.isLate) {
          setError(`You&apos;re ${data.lateByMinutes} minutes late today, but your check-in has been recorded.`);
        } else if (data.earlyDeparture && data.earlyDeparture > 0) {
          setError(`You&apos;re leaving ${data.earlyDeparture} minutes before end of working hours.`);
        } else if (data.overtime && data.overtime > 0) {
          setError(`Great job! You&apos;ve worked ${Math.floor(data.overtime / 60)} hours and ${data.overtime % 60} minutes of overtime today.`);
        }

        await fetchData();
      } else {
        setError(data.error || "Failed to update attendance");
      }
    } catch (error) {
      console.error("Error updating attendance:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setActionLoading(false);
    }
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

  function formatDuration(minutes) {
    if (!minutes) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    return format(parseISO(dateString), "MMM dd, yyyy");
  }

  function handleDateRangeChange(e, field) {
    setDateRange(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  }

  const canCheckInOut = settings?.workingHours?.flexibleCheckin || isWithinWorkingHours();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-xl text-[#BB86FC]">Loading...</p>
        </div>
      ) : stats ? (
        <>
          {/* Welcome Message */}
          <div className="bg-[#181818] text-[#EAEAEA] rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold mb-2">Welcome, {stats.name}! 👋</h1>
                <p className="text-[#A7A7A7]">Role: {stats.role} | Company ID: {stats.companyId}</p>
              </div>
              <div className="text-right">
                <p className="text-[#BB86FC] font-semibold">Today&apos;s Status</p>
                <p className={`font-bold ${attendanceStatus === "Checked In" ? "text-green-400" : "text-[#A7A7A7]"}`}>
                  {attendanceStatus}
                </p>
              </div>
            </div>
          </div>

          {/* Current Session & Company Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Working Hours Information */}
            <div className="bg-[#181818] text-[#EAEAEA] rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-2">Company Working Hours</h2>
              {settings && settings.workingHours ? (
                <div>
                  <p className="text-[#A7A7A7]">
                    {formatTime(settings.workingHours.start)} - {formatTime(settings.workingHours.end)}
                  </p>
                  <p className="text-[#A7A7A7] mt-1">
                    Required: {settings.workingHours.requiredHoursPerDay} hours per day
                  </p>
                  <p className="text-[#A7A7A7] mt-1">
                    Flexible check-in: {settings.workingHours.flexibleCheckin ? "Enabled" : "Disabled"}
                  </p>
                  <p className="text-[#A7A7A7] mt-1">
                    Grace period: {settings.workingHours.graceTimeForLate} minutes
                  </p>
                  {!canCheckInOut && attendanceStatus !== "Checked In" && (
                    <p className="block text-[#BB86FC] mt-2">
                      {settings.workingHours.flexibleCheckin
                        ? "You can check in anytime"
                        : "You can only check in during working hours"}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[#A7A7A7]">Loading working hours...</p>
              )}
            </div>

            {/* Current Session */}
            <div className="bg-[#181818] text-[#EAEAEA] rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-2">Current Session</h2>
              {stats.isCheckedIn && stats.currentSession ? (
                <div>
                  <p className="text-[#A7A7A7]">
                    Started: {format(new Date(stats.currentSession.startTime), "h:mm a")}
                  </p>
                  <p className="text-[#A7A7A7] mt-1">
                    Duration: {formatDuration(currentSessionTime)}
                  </p>
                  <p className="text-[#A7A7A7] mt-1">
                    Location: {stats.currentSession.location}
                  </p>
                  {stats.currentSession.notes && (
                    <p className="text-[#A7A7A7] mt-1">
                      Notes: {stats.currentSession.notes}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[#A7A7A7]">No active session</p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-[#181818] text-[#EAEAEA] rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Total Days Attended</h3>
              <p className="text-3xl font-bold text-[#BB86FC]">{stats.totalDaysAttended}</p>
              <div className="mt-2 text-[#A7A7A7] text-sm">
                <p>Present: {stats.statistics.presentDays} days</p>
                <p>Late: {stats.statistics.lateDays} days</p>
                <p>Half-day: {stats.statistics.halfDays} days</p>
              </div>
            </div>
            <div className="bg-[#181818] text-[#EAEAEA] rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Working Hours</h3>
              <p className="text-3xl font-bold text-[#BB86FC]">{stats.statistics.totalWorkHours}h</p>
              <div className="mt-2 text-[#A7A7A7] text-sm">
                <p>Overtime: {stats.statistics.totalOvertimeHours}h</p>
                <p>Late Time: {stats.statistics.totalLateHours}h</p>
                <p>Early Departures: {stats.statistics.totalEarlyDepartureHours}h</p>
              </div>
            </div>
            <div className="bg-[#181818] text-[#EAEAEA] rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Attendance Rate</h3>
              <p className="text-3xl font-bold text-[#BB86FC]">{stats.statistics.attendancePercentage}%</p>
              <div className="mt-2 text-[#A7A7A7] text-sm">
                <p>Date Range: {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}</p>
                <div className="flex mt-2 space-x-2">
                  <input 
                    type="date" 
                    value={dateRange.startDate}
                    onChange={(e) => handleDateRangeChange(e, 'startDate')}
                    className="bg-[#222222] text-[#EAEAEA] p-1 rounded text-xs"
                  />
                  <input 
                    type="date" 
                    value={dateRange.endDate}
                    onChange={(e) => handleDateRangeChange(e, 'endDate')}
                    className="bg-[#222222] text-[#EAEAEA] p-1 rounded text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Today's Sessions */}
          <div className="bg-[#181818] text-[#EAEAEA] rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Today&apos;s Sessions</h2>
            {stats.todaySessions && stats.todaySessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#333333]">
                      <th className="py-2 px-4 text-left">Check In</th>
                      <th className="py-2 px-4 text-left">Check Out</th>
                      <th className="py-2 px-4 text-left">Duration</th>
                      <th className="py-2 px-4 text-left">Status</th>
                      <th className="py-2 px-4 text-left">Location</th>
                      <th className="py-2 px-4 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.todaySessions.map((session, index) => (
                      <tr key={index} className="border-b border-[#2A2A2A]">
                        <td className="py-2 px-4">
                          {format(new Date(session.checkInTime), "h:mm a")}
                        </td>
                        <td className="py-2 px-4">
                          {session.checkOutTime
                            ? format(new Date(session.checkOutTime), "h:mm a")
                            : "-"}
                        </td>
                        <td className="py-2 px-4">
                          {session.duration ? formatDuration(session.duration) : "-"}
                        </td>
                        <td className="py-2 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            session.status === 'active' ? 'bg-green-800 text-green-200' :
                            session.status === 'completed' ? 'bg-blue-800 text-blue-200' :
                            'bg-red-800 text-red-200'
                          }`}>
                            {session.status}
                          </span>
                        </td>
                        <td className="py-2 px-4">{session.location}</td>
                        <td className="py-2 px-4">{session.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[#A7A7A7]">No sessions recorded today</p>
            )}
          </div>

          {/* Check In/Out Form */}
          <div className="bg-[#181818] text-[#EAEAEA] rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              {attendanceStatus === "Checked In" ? "Check Out" : "Check In"}
            </h2>
            
            {/* Location selector */}
            <div className="mb-4">
              <label className="block text-[#A7A7A7] mb-2">Location</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-[#222222] text-[#EAEAEA] p-2 rounded"
                disabled={attendanceStatus === "Checked In"}
              >
                <option value="office">Office</option>
                <option value="home">Home (Remote)</option>
                <option value="field">Field Work</option>
                <option value="client_site">Client Site</option>
                <option value="business_trip">Business Trip</option>
              </select>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-[#A7A7A7] mb-2">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={attendanceStatus === "Checked In" ? "Notes about your work today..." : "What are you working on today?"}
                className="w-full bg-[#222222] text-[#EAEAEA] p-2 rounded"
                rows="3"
              ></textarea>
            </div>

            {/* Button */}
            <button
              onClick={handleAttendance}
              disabled={actionLoading || (attendanceStatus === "Not Checked In" && !canCheckInOut && !settings?.workingHours?.flexibleCheckin)}
              className={`w-full py-3 px-4 rounded-md font-medium transition-all ${
                actionLoading
                  ? "bg-gray-600 cursor-not-allowed"
                  : attendanceStatus === "Checked In"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : canCheckInOut || settings?.workingHours?.flexibleCheckin
                  ? "bg-[#BB86FC] hover:bg-[#9a67ea] text-white"
                  : "bg-gray-600 cursor-not-allowed"
              }`}
            >
              {actionLoading ? "Processing..." : attendanceStatus === "Checked In" ? "Check Out" : "Check In"}
            </button>
            {error && (
              <p className={`mt-2 ${error.includes("Great job") ? "text-green-400" : "text-red-400"}`}>
                {error}
              </p>
            )}
          </div>

          {/* Attendance Trend */}
          {stats.attendanceTrend && stats.attendanceTrend.length > 0 && (
            <div className="bg-[#181818] text-[#EAEAEA] rounded-lg shadow-lg p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">Attendance Trend</h2>
              <div className="overflow-x-auto">
                <div className="flex min-w-max">
                  {stats.attendanceTrend.map((day, index) => (
                    <div key={index} className="flex flex-col items-center mr-2 last:mr-0" style={{ minWidth: '40px' }}>
                      <div 
                        className={`w-8 h-8 rounded-md flex items-center justify-center mb-1 ${
                          day.status === 'present' ? 'bg-green-700' :
                          day.status === 'late' ? 'bg-yellow-700' :
                          day.status === 'half-day' ? 'bg-blue-700' :
                          day.status === 'absent' ? 'bg-red-700' :
                          'bg-gray-700'
                        }`}
                        title={`${day.date}: ${formatDuration(day.duration)}`}
                      >
                        <span className="text-xs font-bold">{day.duration > 0 ? Math.floor(day.duration / 60) : '-'}</span>
                      </div>
                      <span className="text-xs text-[#A7A7A7]">
                        {format(parseISO(day.date), "d")}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center space-x-4 mt-4 text-xs">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-700 rounded mr-1"></div>
                    <span>Present</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-700 rounded mr-1"></div>
                    <span>Late</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-700 rounded mr-1"></div>
                    <span>Half-day</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-700 rounded mr-1"></div>
                    <span>Absent</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-[#181818] text-[#EAEAEA] rounded-lg shadow-lg p-6">
          <p className="text-[#BB86FC]">Failed to load dashboard data. Please refresh the page.</p>
        </div>
      )}
    </div>
  );
}