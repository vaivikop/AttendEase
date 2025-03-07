"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmployees, setShowEmployees] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deletingEmployee, setDeletingEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const employeesPerPage = 5;

  // Working hours and shifts states
  const [workingHours, setWorkingHours] = useState({ start: "", end: "" });
  const [requiredHoursPerDay, setRequiredHoursPerDay] = useState(8);
  const [flexibleCheckIn, setFlexibleCheckIn] = useState(false);
  const [gracePeriod, setGracePeriod] = useState(15); // in minutes
  const [shifts, setShifts] = useState([]);
  const [newShift, setNewShift] = useState({ name: "", start: "", end: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [weekends, setWeekends] = useState([0, 6]); // ✅ Default: Saturday & Sunday
  const [holidays, setHolidays] = useState([]); // ✅ Default: Empty array

  // Attendance states
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [filteredAttendance, setFilteredAttendance] = useState([]);
  const [attendanceFilter, setAttendanceFilter] = useState({ startDate: "", endDate: "" });

  // Location states
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState({ name: "", policy: "" });

  // ✅ Breaks & Attendance Rules
  const [breaks, setBreaks] = useState({
    lunchBreak: { start: "13:00", end: "14:00" },
    shortBreaks: { count: 2, duration: 15 },
  });

  const [attendanceRules, setAttendanceRules] = useState({
    autoCheckoutEnabled: true,
    autoCheckoutTime: "23:59",
    allowMultipleSessions: true,
    minimumMinutesPerSession: 30,
    overtimeThreshold: 480,
    attendanceReportingTimeZone: "UTC",
  });

  useEffect(() => {
    fetchStats();
    fetchSettings();
    fetchAttendance();
    fetchLocations();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (res.ok) setStats(data);
      else toast.error("Failed to fetch stats");
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Something went wrong");
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Settings fetch error:", errorData);
        toast.error(errorData.error || "Failed to fetch settings");
        return;
      }
      
      const data = await res.json();
      console.log("Fetched settings:", data);
      
      // Safely set working hours
      if (data.workingHours && typeof data.workingHours === 'object') {
        setWorkingHours({
          start: data.workingHours.start || "",
          end: data.workingHours.end || ""
        });
      } else {
        setWorkingHours({ start: "", end: "" });
      }
      
      // Safely set shifts
      if (Array.isArray(data.shifts)) {
        setShifts(data.shifts);
      } else {
        setShifts([]);
      }
      
      // Set other settings
      setRequiredHoursPerDay(data.requiredHoursPerDay || 8);
      setFlexibleCheckIn(data.flexibleCheckIn || false);
      setGracePeriod(data.gracePeriod || 15);
      
    } catch (error) {
      console.error("Error in fetchSettings:", error);
      toast.error("Error fetching settings");
      setWorkingHours({ start: "", end: "" });
      setShifts([]);
    }
  };

  const updateSettings = async () => {
    if (!workingHours.start || !workingHours.end) {
      toast.error("Please set working hours!");
      return;
    }
  
    setIsSaving(true);
  
    try {
      const settingsData = {
        workingHours: {
          start: workingHours.start,
          end: workingHours.end,
          requiredHoursPerDay: requiredHoursPerDay || 8,
          flexibleCheckin: flexibleCheckIn,
          graceTimeForLate: gracePeriod || 15,
        },
        breaks: breaks || { lunchBreak: { start: "13:00", end: "14:00" }, shortBreaks: { count: 2, duration: 15 } },
        weekends: weekends || [0, 6],
        holidays: holidays || [],
        attendanceRules: attendanceRules,
        locations: locations || [],
        shifts: shifts || [], // ✅ Ensure shifts are sent
      };
  
      console.log("Sending settings data:", settingsData); // ✅ Debugging
  
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsData),
      });
  
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update settings");
      }
  
      toast.success("Settings updated successfully!");
      await fetchSettings(); // ✅ Refresh settings after update
    } catch (error) {
      console.error("Exception in updateSettings:", error);
      toast.error(error.message || "Server error when saving settings");
    } finally {
      setIsSaving(false);
    }
  };
  
const addShift = () => {
    if (!newShift.name || !newShift.start || !newShift.end) {
        toast.error("Please fill all shift details");
        return;
    }

    const updatedShifts = [
        ...shifts,
        {
            name: newShift.name,
            start: newShift.start,
            end: newShift.end
        }
    ];

    setShifts(updatedShifts);
    setNewShift({ name: "", start: "", end: "" });

    console.log("Shifts after adding:", updatedShifts);
};

const removeShift = (index) => {
    const updatedShifts = shifts.filter((_, i) => i !== index);
    setShifts(updatedShifts);
    console.log("Shifts after removing:", updatedShifts);
};


  const fetchEmployees = async () => {
    if (showEmployees) {
      setShowEmployees(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/employees");
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees);
        setFilteredEmployees(data.employees);
        setShowEmployees(true);
        toast.success("Employee list loaded!");
      } else {
        toast.error("Failed to fetch employees");
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Something went wrong");
    }
    setLoading(false);
  };

  const deleteEmployee = async () => {
    if (!deletingEmployee) return;
    try {
      const res = await fetch(`/api/admin/employees/${deletingEmployee._id}`, { method: "DELETE" });

      const data = await res.json();
      if (res.ok) {
        setEmployees((prev) => prev.filter((e) => e._id !== deletingEmployee._id));
        setFilteredEmployees((prev) => prev.filter((e) => e._id !== deletingEmployee._id));
        toast.success(data.message || "Employee deleted!");
        setDeletingEmployee(null);
      } else {
        toast.error(data.error || "Failed to delete employee");
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Something went wrong");
    }
  };

  const updateEmployee = async () => {
    if (!editingEmployee) return;
    try {
      const res = await fetch(`/api/admin/employees/${editingEmployee._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEmployee),
      });
      const data = await res.json();
      if (res.ok) {
        setEmployees((prev) =>
          prev.map((e) => (e._id === editingEmployee._id ? editingEmployee : e))
        );
        setEditingEmployee(null);
        toast.success(data.message || "Employee updated!");
      } else {
        toast.error(data.error || "Failed to update employee");
      }
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error("Something went wrong");
    }
  };

  const filterEmployees = (query) => {
    setSearchQuery(query);
    setFilteredEmployees(employees.filter((e) =>
      e.name.toLowerCase().includes(query.toLowerCase())
    ));
  };

  const fetchAttendance = async () => {
    try {
      let url = "/api/admin/attendance";
      if (attendanceFilter.startDate && attendanceFilter.endDate) {
        url += `?startDate=${attendanceFilter.startDate}&endDate=${attendanceFilter.endDate}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setAttendanceRecords(data.attendance);
        setFilteredAttendance(data.attendance);
      } else {
        toast.error("Failed to fetch attendance records");
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Something went wrong");
    }
  };
  

  const filterAttendance = () => {
    const filtered = attendanceRecords.filter(record => {
      const recordDate = new Date(record.date);
      const startDate = new Date(attendanceFilter.startDate);
      const endDate = new Date(attendanceFilter.endDate);
      return recordDate >= startDate && recordDate <= endDate;
    });
    setFilteredAttendance(filtered);
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/admin/locations");
      const data = await res.json();
      if (res.ok) {
        setLocations(data.locations);
      } else {
        toast.error("Failed to fetch locations");
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast.error("Something went wrong");
    }
  };

  const addLocation = () => {
    if (!newLocation.name || !newLocation.policy) {
      toast.error("Please fill all location details");
      return;
    }

    const updatedLocations = [
      ...locations,
      {
        name: newLocation.name,
        policy: newLocation.policy
      }
    ];
    
    setLocations(updatedLocations);
    setNewLocation({ name: "", policy: "" });
  };

  const removeLocation = (index) => {
    const updatedLocations = locations.filter((_, i) => i !== index);
    setLocations(updatedLocations);
  };

  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * employeesPerPage,
    currentPage * employeesPerPage
  );

  return (
    <div className="container px-3 py-4 md:px-6 md:py-6 max-w-5xl mx-auto text-white bg-gray-900">
      <h2 className="text-3xl md:text-4xl font-extrabold mb-6 text-purple-400 text-center">
        Admin Dashboard
      </h2>
  
      {/* Stats Cards Section - Fully responsive with proper stacking on mobile */}
      {stats && (
        <div className="w-full space-y-4 md:space-y-6">
          {/* Company ID Card - Standalone for better mobile visibility */}
          <div className="p-4 md:p-6 bg-gray-800 rounded-lg shadow-xl border border-purple-600 w-full">
            <p className="text-sm md:text-lg text-gray-300">Company ID</p>
            <p className="text-xl md:text-2xl font-bold text-purple-400">{stats.companyId}</p>
          </div>
          
          {/* Stats Cards - Stack on mobile, side-by-side on tablet/desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 md:p-6 bg-gray-800 rounded-lg text-center shadow-lg">
              <p className="text-sm md:text-lg text-gray-300">Total Employees</p>
              <p className="text-2xl md:text-3xl font-bold text-purple-400">{stats.totalEmployees}</p>
            </div>
            <div className="p-4 md:p-6 bg-gray-800 rounded-lg text-center shadow-lg">
              <p className="text-sm md:text-lg text-gray-300">Total Admins</p>
              <p className="text-2xl md:text-3xl font-bold text-purple-400">{stats.totalAdmins}</p>
            </div>
          </div>
        </div>
      )}
       
      {/* Working Hours Section - Improved layout for mobile */}
      <div className="mt-4 md:mt-6 w-full bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl border border-purple-600">
        <h3 className="text-xl md:text-2xl font-bold text-purple-400 mb-4">Set Working Hours</h3>
        
        {/* Time inputs - Stack on mobile, side-by-side on larger screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col">
            <label className="mb-1 text-sm md:text-base text-gray-300">Start Time</label>
            <input 
              type="time" 
              className="p-2 md:p-3 bg-gray-700 text-white rounded w-full text-sm md:text-base" 
              value={workingHours.start} 
              onChange={(e) => setWorkingHours({ ...workingHours, start: e.target.value })} 
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-sm md:text-base text-gray-300">End Time</label>
            <input 
              type="time" 
              className="p-2 md:p-3 bg-gray-700 text-white rounded w-full text-sm md:text-base" 
              value={workingHours.end} 
              onChange={(e) => setWorkingHours({ ...workingHours, end: e.target.value })} 
            />
          </div>
        </div>
  
        {/* Required Hours Per Day */}
        <div className="flex flex-col mb-4">
          <label className="mb-1 text-sm md:text-base text-gray-300">Required Hours Per Day</label>
          <input 
            type="number" 
            className="p-2 md:p-3 bg-gray-700 text-white rounded text-sm md:text-base" 
            value={requiredHoursPerDay} 
            onChange={(e) => setRequiredHoursPerDay(Number(e.target.value))} 
          />
        </div>
  
        {/* Flexible Check-In Toggle */}
        <div className="flex items-center mb-4">
          <label className="mr-2 text-sm md:text-base text-gray-300">Flexible Check-In</label>
          <input 
            type="checkbox" 
            className="form-checkbox h-4 w-4 md:h-5 md:w-5 text-purple-600" 
            checked={flexibleCheckIn} 
            onChange={(e) => setFlexibleCheckIn(e.target.checked)} 
          />
        </div>
  
        {/* Grace Period */}
        <div className="flex flex-col mb-4">
          <label className="mb-1 text-sm md:text-base text-gray-300">Grace Period (minutes)</label>
          <input 
            type="number" 
            className="p-2 md:p-3 bg-gray-700 text-white rounded text-sm md:text-base" 
            value={gracePeriod} 
            onChange={(e) => setGracePeriod(Number(e.target.value))} 
          />
        </div>
  
        {/* Shift Management */}
        <h3 className="text-xl md:text-2xl font-bold text-purple-400 mt-6 mb-4">Manage Shifts</h3>
        <div className="mb-4 max-h-60 overflow-y-auto">
          {shifts.length === 0 ? (
            <p className="text-gray-400 italic text-sm md:text-base">No shifts defined yet</p>
          ) : (
            shifts.map((shift, index) => (
              <div key={index} className="flex justify-between p-2 md:p-3 bg-gray-700 rounded mb-2 text-sm md:text-base">
                <p>{shift.name}: {shift.start} - {shift.end}</p>
                <button className="bg-red-500 px-2 py-1 md:px-3 md:py-1 rounded text-xs md:text-sm" onClick={() => removeShift(index)}>Remove</button>
              </div>
            ))
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <input 
            type="text" 
            placeholder="Shift Name" 
            className="p-2 md:p-3 bg-gray-700 text-white rounded text-sm md:text-base" 
            value={newShift.name} 
            onChange={(e) => setNewShift({ ...newShift, name: e.target.value })} 
          />
          <input 
            type="time" 
            className="p-2 md:p-3 bg-gray-700 text-white rounded text-sm md:text-base" 
            value={newShift.start} 
            onChange={(e) => setNewShift({ ...newShift, start: e.target.value })} 
          />
          <input 
            type="time" 
            className="p-2 md:p-3 bg-gray-700 text-white rounded text-sm md:text-base" 
            value={newShift.end} 
            onChange={(e) => setNewShift({ ...newShift, end: e.target.value })} 
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            className="bg-green-500 px-3 py-2 md:px-4 md:py-2 rounded hover:bg-green-600 transition text-sm md:text-base" 
            onClick={addShift}
          >
            Add Shift
          </button>
          <button 
            className={`bg-blue-500 px-3 py-2 md:px-4 md:py-2 rounded hover:bg-blue-600 transition text-sm md:text-base ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`} 
            onClick={updateSettings}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </div>
  
      {/* Employee Management Section */}
      <div className="mt-4 md:mt-6 w-full bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl border border-purple-600">
        <h3 className="text-xl md:text-2xl font-bold text-purple-400 mb-4">Employee Management</h3>
  
        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search Employees..."
          className="w-full p-2 md:p-3 mb-4 rounded bg-gray-700 text-white text-sm md:text-base"
          value={searchQuery}
          onChange={(e) => filterEmployees(e.target.value)}
        />
  
        <button
          onClick={fetchEmployees}
          className={`px-3 py-2 md:px-4 md:py-2 mb-4 ${loading ? 'bg-gray-600' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition text-sm md:text-base`}
          disabled={loading}
        >
          {loading ? 'Loading...' : showEmployees ? 'Hide Employees' : 'Show Employees'}
        </button>
  
        {/* Employee List */}
        {showEmployees && (
          <div className="space-y-4">
            {paginatedEmployees.length === 0 ? (
              <p className="text-gray-400 italic text-center py-4 text-sm md:text-base">No employees found</p>
            ) : (
              paginatedEmployees.map((emp) => (
                <div key={emp._id} className="flex flex-col sm:flex-row justify-between p-3 bg-gray-700 rounded-lg gap-2 text-sm md:text-base">
                  <p className="overflow-hidden text-ellipsis">{emp.name} - {emp.email}</p>
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    <button
                      className="px-2 py-1 md:px-3 md:py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition text-xs md:text-sm flex-1 sm:flex-none text-center"
                      onClick={() => setEditingEmployee(emp)}
                    >
                      Edit
                    </button>
                    <button
                      className="px-2 py-1 md:px-3 md:py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-xs md:text-sm flex-1 sm:flex-none text-center"
                      onClick={() => setDeletingEmployee(emp)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
  
            {/* Pagination Controls */}
            {paginatedEmployees.length > 0 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  className={`px-2 py-1 md:px-3 md:py-1 ${currentPage === 1 ? "bg-gray-600" : "bg-purple-500 hover:bg-purple-600"} text-white rounded transition text-xs md:text-sm`}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>
                <span className="px-2 py-1 md:px-3 md:py-1 bg-gray-700 text-white rounded text-xs md:text-sm">
                  Page {currentPage}
                </span>
                <button
                  className={`px-2 py-1 md:px-3 md:py-1 ${filteredEmployees.length <= currentPage * employeesPerPage ? "bg-gray-600" : "bg-purple-500 hover:bg-purple-600"} text-white rounded transition text-xs md:text-sm`}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  disabled={filteredEmployees.length <= currentPage * employeesPerPage}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
  
      {/* Attendance Management Section */}
      <div className="mt-4 md:mt-6 w-full bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl border border-purple-600">
        <h3 className="text-xl md:text-2xl font-bold text-purple-400 mb-4">Attendance Management</h3>
  
        {/* Attendance Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex flex-col">
            <label className="mb-1 text-sm md:text-base text-gray-300">Start Date</label>
            <input 
              type="date" 
              className="p-2 md:p-3 bg-gray-700 text-white rounded text-sm md:text-base" 
              value={attendanceFilter.startDate} 
              onChange={(e) => setAttendanceFilter({ ...attendanceFilter, startDate: e.target.value })} 
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-sm md:text-base text-gray-300">End Date</label>
            <input 
              type="date" 
              className="p-2 md:p-3 bg-gray-700 text-white rounded text-sm md:text-base" 
              value={attendanceFilter.endDate} 
              onChange={(e) => setAttendanceFilter({ ...attendanceFilter, endDate: e.target.value })} 
            />
          </div>
          <button 
            className="bg-blue-500 px-3 py-2 md:px-4 md:py-2 rounded hover:bg-blue-600 transition text-sm md:text-base mt-2 sm:mt-auto" 
            onClick={fetchAttendance}
          >
            Filter
          </button>
        </div>
  
        {/* Attendance Records Table */}
        <div className="w-full bg-gray-800 rounded-lg border border-gray-700">
          <h4 className="text-lg md:text-xl font-bold text-purple-400 p-3 md:p-4 border-b border-gray-700">Attendance Records</h4>
  
          {filteredAttendance.length === 0 ? (
            <p className="text-gray-400 italic text-center py-4 text-sm md:text-base">No attendance records found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-600 text-xs md:text-sm">
                <thead>
                  <tr className="bg-gray-700 text-white">
                    <th className="p-2 md:p-3 border border-gray-600">Employee Name</th>
                    <th className="p-2 md:p-3 border border-gray-600">Total Sessions</th>
                    <th className="p-2 md:p-3 border border-gray-600">Total Hours</th>
                    <th className="p-2 md:p-3 border border-gray-600">Late Arrivals</th>
                    <th className="p-2 md:p-3 border border-gray-600">Early Departures</th>
                    <th className="p-2 md:p-3 border border-gray-600">Overtime (mins)</th>
                    <th className="p-2 md:p-3 border border-gray-600">Last Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.map((record, index) => (
                    <tr key={index} className="text-gray-300 bg-gray-800 hover:bg-gray-700 transition">
                      <td className="p-2 md:p-3 border border-gray-600">{record.employeeName}</td>
                      <td className="p-2 md:p-3 border border-gray-600">{record.totalSessions}</td>
                      <td className="p-2 md:p-3 border border-gray-600">{(record.totalDuration / 60).toFixed(2)} hrs</td>
                      <td className="p-2 md:p-3 border border-gray-600">{record.lateArrivals}</td>
                      <td className="p-2 md:p-3 border border-gray-600">{record.earlyDepartures}</td>
                      <td className="p-2 md:p-3 border border-gray-600">{record.overtime}</td>
                      <td className="p-2 md:p-3 border border-gray-600">{record.lastStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
  
      {/* Location Management Section */}
      <div className="mt-4 md:mt-6 w-full bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl border border-purple-600">
        <h3 className="text-xl md:text-2xl font-bold text-purple-400 mb-4">Location Management</h3>
  
        {/* Location List */}
        <div className="mb-4 max-h-60 overflow-y-auto">
          {locations.length === 0 ? (
            <p className="text-gray-400 italic text-sm md:text-base">No locations defined yet</p>
          ) : (
            locations.map((location, index) => (
              <div key={index} className="flex justify-between p-2 md:p-3 bg-gray-700 rounded mb-2 text-sm md:text-base">
                <p>{location.name}: {location.policy}</p>
                <button className="bg-red-500 px-2 py-1 md:px-3 md:py-1 rounded text-xs md:text-sm" onClick={() => removeLocation(index)}>Remove</button>
              </div>
            ))
          )}
        </div>
        
        {/* Add Location Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <input 
            type="text" 
            placeholder="Location Name" 
            className="p-2 md:p-3 bg-gray-700 text-white rounded text-sm md:text-base" 
            value={newLocation.name} 
            onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })} 
          />
          <input 
            type="text" 
            placeholder="Location Policy" 
            className="p-2 md:p-3 bg-gray-700 text-white rounded text-sm md:text-base" 
            value={newLocation.policy} 
            onChange={(e) => setNewLocation({ ...newLocation, policy: e.target.value })} 
          />
        </div>
        
        <button 
          className="bg-green-500 px-3 py-2 md:px-4 md:py-2 rounded hover:bg-green-600 transition text-sm md:text-base" 
          onClick={addLocation}
        >
          Add Location
        </button>
      </div>
  
      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-4 md:p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg md:text-xl font-bold text-purple-400 mb-4">Edit Employee</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1 text-sm md:text-base">Name</label>
                <input
                  type="text"
                  className="w-full p-2 md:p-3 bg-gray-700 text-white rounded text-sm md:text-base"
                  value={editingEmployee.name}
                  onChange={(e) => setEditingEmployee({...editingEmployee, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1 text-sm md:text-base">Email</label>
                <input
                  type="email"
                  className="w-full p-2 md:p-3 bg-gray-700 text-white rounded text-sm md:text-base"
                  value={editingEmployee.email}
                  onChange={(e) => setEditingEmployee({...editingEmployee, email: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  className="px-3 py-2 md:px-4 md:py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition text-sm md:text-base"
                  onClick={() => setEditingEmployee(null)}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-2 md:px-4 md:py-2 bg-green-500 text-white rounded hover:bg-green-600 transition text-sm md:text-base"
                  onClick={updateEmployee}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
  
      {/* Delete Confirmation Modal */}
      {deletingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-4 md:p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg md:text-xl font-bold text-red-400 mb-4">Confirm Delete</h3>
            <p className="mb-6 text-sm md:text-base">
              Are you sure you want to delete employee: <span className="font-semibold">{deletingEmployee.name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-3 py-2 md:px-4 md:py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition text-sm md:text-base"
                onClick={() => setDeletingEmployee(null)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-2 md:px-4 md:py-2 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm md:text-base"
                onClick={deleteEmployee}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );}