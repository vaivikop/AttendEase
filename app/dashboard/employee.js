"use client";

import { useEffect, useState } from "react";
import { format, parseISO, formatDistanceStrict } from "date-fns";

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

  // Fetch data on component mount or when date range changes
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // Timer for current session
  useEffect(() => {
    let timer;
    if (stats && stats.isCheckedIn) {
      // Start timer
      timer = setInterval(() => {
        const startTime = new Date(stats.currentSession.startTime);
        const duration = Math.floor((new Date() - startTime) / (1000 * 60));
        setCurrentSessionTime(duration);
      }, 60000); // Update every minute
      
      // Initialize with current duration
      if (stats.currentSession) {
        setCurrentSessionTime(stats.currentSession.duration);
      }
    }
    
    return () => clearInterval(timer);
  }, [stats]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch attendance stats with date range
      const statsRes = await fetch(
        `/api/attendance/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      const statsData = await statsRes.json();
      if (statsRes.ok) {
        setStats(statsData);
        setAttendanceStatus(statsData.isCheckedIn ? "Checked In" : "Not Checked In");
      }

      // Fetch company settings
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
        
        // Show appropriate feedback
        if (data.isLate) {
          setError(`You're ${data.lateByMinutes} minutes late today, but your check-in has been recorded.`);
        } else if (data.earlyDeparture && data.earlyDeparture > 0) {
          setError(`You're leaving ${data.earlyDeparture} minutes before end of working hours.`);
        } else if (data.overtime && data.overtime > 0) {
          setError(`Great job! You've worked ${Math.floor(data.overtime / 60)} hours and ${data.overtime % 60} minutes of overtime today.`);
        }

        // Update stats after successful check-in/out
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

  // Card style classes
  const cardClass = "bg-[#181818] text-[#EAEAEA] rounded-lg shadow-lg p-6 border-2 border-[#BB86FC] transition-all duration-300 hover:shadow-xl hover:shadow-[#BB86FC]/10";
  const cardHeaderClass = "text-xl font-semibold mb-4 text-[#BB86FC]";
  
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto bg-[#121212]">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse text-xl text-[#BB86FC]">Loading...</div>
        </div>
      ) : stats ? (
        <div className="flex flex-col gap-6">
          {/* Welcome Message */}
          <div className={`${cardClass} border-[#BB86FC]`}>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-2 text-[#BB86FC]">Welcome, {stats.name}! 👋</h1>
                <p className="text-[#A7A7A7]">Role: {stats.role} | Company ID: {stats.companyId}</p>
              </div>
              <div className="md:text-right">
                <p className="text-[#BB86FC] font-semibold">Today&apos;s Status</p>
                <p className={`font-bold text-lg ${attendanceStatus === "Checked In" ? "text-green-400" : "text-[#A7A7A7]"}`}>
                  {attendanceStatus}
                </p>
              </div>
            </div>
          </div>

          {/* Current Session & Company Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Working Hours Information */}
            <div className={cardClass}>
              <h2 className={cardHeaderClass}>Company Working Hours</h2>
              {settings && settings.workingHours ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-[#222222] rounded-md">
                    <span>Working Hours:</span>
                    <span className="font-semibold text-[#BB86FC]">
                      {formatTime(settings.workingHours.start)} - {formatTime(settings.workingHours.end)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-[#222222] rounded-md">
                    <span>Required Daily:</span>
                    <span className="font-semibold text-[#BB86FC]">
                      {settings.workingHours.requiredHoursPerDay} hours
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-[#222222] rounded-md">
                    <span>Flexible check-in:</span>
                    <span className={`font-semibold ${settings.workingHours.flexibleCheckin ? "text-green-400" : "text-red-400"}`}>
                      {settings.workingHours.flexibleCheckin ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-[#222222] rounded-md">
                    <span>Grace period:</span>
                    <span className="font-semibold text-[#BB86FC]">
                      {settings.workingHours.graceTimeForLate} minutes
                    </span>
                  </div>
                  {!canCheckInOut && attendanceStatus !== "Checked In" && (
                    <p className="block text-[#BB86FC] mt-2 p-2 bg-[#2A1931] rounded-md">
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
            <div className={cardClass}>
              <h2 className={cardHeaderClass}>Current Session</h2>
              {stats.isCheckedIn && stats.currentSession ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-[#222222] rounded-md">
                    <span>Started:</span>
                    <span className="font-semibold text-[#BB86FC]">
                      {format(new Date(stats.currentSession.startTime), "h:mm a")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-[#222222] rounded-md">
                    <span>Duration:</span>
                    <span className="font-semibold text-[#BB86FC]">
                      {formatDuration(currentSessionTime)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-[#222222] rounded-md">
                    <span>Location:</span>
                    <span className="font-semibold text-[#BB86FC]">
                      {stats.currentSession.location}
                    </span>
                  </div>
                  {stats.currentSession.notes && (
                    <div className="p-2 bg-[#222222] rounded-md">
                      <span className="block">Notes:</span>
                      <span className="block italic text-[#BB86FC] mt-1">
                      &quot;{stats.currentSession.notes}&quot;
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 bg-[#222222] rounded-md">
                  <p className="text-[#A7A7A7]">No active session</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className={cardClass}>
              <h3 className={cardHeaderClass}>Total Days Attended</h3>
              <div className="flex flex-col items-center justify-center">
                <p className="text-4xl font-bold text-[#BB86FC] mb-4">{stats.totalDaysAttended}</p>
                <div className="w-full space-y-2">
                  <div className="flex justify-between p-2 bg-[#222222] rounded-md">
                    <span>Present:</span>
                    <span className="font-semibold text-green-400">{stats.statistics.presentDays} days</span>
                  </div>
                  <div className="flex justify-between p-2 bg-[#222222] rounded-md">
                    <span>Late:</span>
                    <span className="font-semibold text-yellow-400">{stats.statistics.lateDays} days</span>
                  </div>
                  <div className="flex justify-between p-2 bg-[#222222] rounded-md">
                    <span>Half-day:</span>
                    <span className="font-semibold text-blue-400">{stats.statistics.halfDays} days</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={cardClass}>
              <h3 className={cardHeaderClass}>Working Hours</h3>
              <div className="flex flex-col items-center justify-center">
                <p className="text-4xl font-bold text-[#BB86FC] mb-4">{stats.statistics.totalWorkHours}h</p>
                <div className="w-full space-y-2">
                  <div className="flex justify-between p-2 bg-[#222222] rounded-md">
                    <span>Overtime:</span>
                    <span className="font-semibold text-green-400">{stats.statistics.totalOvertimeHours}h</span>
                  </div>
                  <div className="flex justify-between p-2 bg-[#222222] rounded-md">
                    <span>Late Time:</span>
                    <span className="font-semibold text-yellow-400">{stats.statistics.totalLateHours}h</span>
                  </div>
                  <div className="flex justify-between p-2 bg-[#222222] rounded-md">
                    <span>Early Departures:</span>
                    <span className="font-semibold text-red-400">{stats.statistics.totalEarlyDepartureHours}h</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={cardClass}>
              <h3 className={cardHeaderClass}>Attendance Rate</h3>
              <div className="flex flex-col items-center justify-center">
                <p className="text-4xl font-bold text-[#BB86FC] mb-4">{stats.statistics.attendancePercentage}%</p>
                <div className="w-full space-y-2">
                  <div className="p-2 bg-[#222222] rounded-md">
                    <p className="text-center">Date Range</p>
                    <p className="text-center text-[#BB86FC] font-semibold">
                      {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="date" 
                      value={dateRange.startDate}
                      onChange={(e) => handleDateRangeChange(e, 'startDate')}
                      className="bg-[#222222] text-[#EAEAEA] p-2 rounded border border-[#BB86FC] focus:outline-none focus:ring-2 focus:ring-[#BB86FC]"
                    />
                    <input 
                      type="date" 
                      value={dateRange.endDate}
                      onChange={(e) => handleDateRangeChange(e, 'endDate')}
                      className="bg-[#222222] text-[#EAEAEA] p-2 rounded border border-[#BB86FC] focus:outline-none focus:ring-2 focus:ring-[#BB86FC]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Sessions */}
          <div className={cardClass}>
            <h2 className={cardHeaderClass}>Today&apos;s Sessions</h2>
            {stats.todaySessions && stats.todaySessions.length > 0 ? (
              <div className="overflow-x-auto rounded-md border border-[#BB86FC]/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#2A1931]">
                      <th className="py-3 px-4 text-left text-[#BB86FC]">Check In</th>
                      <th className="py-3 px-4 text-left text-[#BB86FC]">Check Out</th>
                      <th className="py-3 px-4 text-left text-[#BB86FC]">Duration</th>
                      <th className="py-3 px-4 text-left text-[#BB86FC]">Status</th>
                      <th className="py-3 px-4 text-left text-[#BB86FC]">Location</th>
                      <th className="py-3 px-4 text-left text-[#BB86FC]">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.todaySessions.map((session, index) => (
                      <tr key={index} className={`border-b border-[#333333] ${index % 2 === 0 ? 'bg-[#222222]' : 'bg-[#1A1A1A]'}`}>
                        <td className="py-3 px-4">
                          {format(new Date(session.checkInTime), "h:mm a")}
                        </td>
                        <td className="py-3 px-4">
                          {session.checkOutTime
                            ? format(new Date(session.checkOutTime), "h:mm a")
                            : "-"}
                        </td>
                        <td className="py-3 px-4">
                          {session.duration ? formatDuration(session.duration) : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            session.status === 'active' ? 'bg-green-800 text-green-200' :
                            session.status === 'completed' ? 'bg-blue-800 text-blue-200' :
                            'bg-red-800 text-red-200'
                          }`}>
                            {session.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">{session.location}</td>
                        <td className="py-3 px-4">{session.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 bg-[#222222] rounded-md">
                <p className="text-[#A7A7A7]">No sessions recorded today</p>
              </div>
            )}
          </div>

          {/* Check In/Out Form */}
          <div className={cardClass}>
            <h2 className={cardHeaderClass}>
              {attendanceStatus === "Checked In" ? "Check Out" : "Check In"}
            </h2>
            
            {/* Location selector */}
            <div className="mb-4">
              <label className="block text-[#BB86FC] mb-2">Location</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-[#222222] text-[#EAEAEA] p-3 rounded border border-[#BB86FC] focus:outline-none focus:ring-2 focus:ring-[#BB86FC]"
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
              <label className="block text-[#BB86FC] mb-2">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={attendanceStatus === "Checked In" ? "Notes about your work today..." : "What are you working on today?"}
                className="w-full bg-[#222222] text-[#EAEAEA] p-3 rounded border border-[#BB86FC] focus:outline-none focus:ring-2 focus:ring-[#BB86FC]"
                rows="3"
              ></textarea>
            </div>

            {/* Button */}
            <button
              onClick={handleAttendance}
              disabled={actionLoading || (attendanceStatus === "Not Checked In" && !canCheckInOut && !settings?.workingHours?.flexibleCheckin)}
              className={`w-full py-4 px-4 rounded-md font-medium transition-all ${
                actionLoading
                  ? "bg-gray-600 cursor-not-allowed"
                  : attendanceStatus === "Checked In"
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-red-500/30"
                  : canCheckInOut || settings?.workingHours?.flexibleCheckin
                  ? "bg-[#BB86FC] hover:bg-[#9a67ea] text-white shadow-lg hover:shadow-[#BB86FC]/30"
                  : "bg-gray-600 cursor-not-allowed"
              }`}
            >
              {actionLoading ? "Processing..." : attendanceStatus === "Checked In" ? "Check Out" : "Check In"}
            </button>
            {error && (
              <div className={`mt-3 p-3 rounded-md ${error.includes("Great job") ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
                {error}
              </div>
            )}
          </div>

          {/* Attendance Trend */}
          {stats.attendanceTrend && stats.attendanceTrend.length > 0 && (
            <div className={cardClass}>
              <h2 className={cardHeaderClass}>Attendance Trend</h2>
              <div className="overflow-x-auto bg-[#222222] p-4 rounded-md border border-[#BB86FC]/50">
                <div className="flex min-w-max">
                  {stats.attendanceTrend.map((day, index) => (
                    <div key={index} className="flex flex-col items-center mr-3 last:mr-0" style={{ minWidth: '45px' }}>
                      <div 
                        className={`w-10 h-10 rounded-md flex items-center justify-center mb-2 border border-[#BB86FC]/30 transition-transform hover:scale-110 ${
                          day.status === 'present' ? 'bg-green-700' :
                          day.status === 'late' ? 'bg-yellow-700' :
                          day.status === 'half-day' ? 'bg-blue-700' :
                          day.status === 'absent' ? 'bg-red-700' :
                          'bg-gray-700'
                        }`}
                        title={`${day.date}: ${formatDuration(day.duration)}`}
                      >
                        <span className="text-sm font-bold">{day.duration > 0 ? Math.floor(day.duration / 60) : '-'}</span>
                      </div>
                      <span className="text-xs text-[#A7A7A7]">
                        {format(parseISO(day.date), "d")}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs bg-[#1A1A1A] p-3 rounded-md">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-700 rounded mr-2 border border-white/30"></div>
                    <span>Present</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-700 rounded mr-2 border border-white/30"></div>
                    <span>Late</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-700 rounded mr-2 border border-white/30"></div>
                    <span>Half-day</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-700 rounded mr-2 border border-white/30"></div>
                    <span>Absent</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={`${cardClass} border-red-500`}>
          <p className="text-red-400 text-center">Failed to load dashboard data. Please refresh the page.</p>
        </div>
      )}
    </div>
  );
}