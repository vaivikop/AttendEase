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
  const [shifts, setShifts] = useState([]);
  const [newShift, setNewShift] = useState({ name: "", start: "", end: "" });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchSettings();
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
      // Prepare the data to send
      const settingsData = {
        workingHours: {
          start: workingHours.start,
          end: workingHours.end
        },
        shifts: shifts.map(shift => ({
          name: shift.name,
          start: shift.start,
          end: shift.end
        }))
      };
      
      console.log("Sending settings data:", settingsData);
      
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsData),
      });

      const responseText = await res.text();
      console.log("Raw response:", responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse response as JSON:", e);
        toast.error("Received invalid response from server");
        setIsSaving(false);
        return;
      }

      if (res.ok) {
        toast.success("Settings updated successfully!");
        // Refresh the settings to confirm changes were saved
        await fetchSettings();
      } else {
        console.error("Error updating settings:", data);
        toast.error(data.error || "Failed to update settings");
      }
    } catch (error) {
      console.error("Exception in updateSettings:", error);
      toast.error("Server error when saving settings");
    } finally {
      setIsSaving(false);
    }
  };

  const addShift = () => {
    if (!newShift.name || !newShift.start || !newShift.end) {
      toast.error("Please fill all shift details");
      return;
    }

    // Create a new array with the existing shifts plus the new one
    const updatedShifts = [
      ...shifts, 
      {
        name: newShift.name,
        start: newShift.start,
        end: newShift.end
      }
    ];
    
    // Update state
    setShifts(updatedShifts);
    // Reset the new shift form
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
      const res = await fetch(`/api/admin/employees/${deletingEmployee._id}`, {
        method: "DELETE",
      });
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

  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * employeesPerPage,
    currentPage * employeesPerPage
  );

  return (
    <div className="p-6 text-white min-h-screen bg-gray-900 flex flex-col items-center">
      <h2 className="text-4xl font-extrabold mb-6 text-purple-400 text-center">
        Admin Dashboard
      </h2>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-6xl">
          <div className="p-6 bg-gray-800 rounded-lg shadow-xl border border-purple-600">
            <p className="text-lg text-gray-300">Company ID</p>
            <p className="text-2xl font-bold text-purple-400">{stats.companyId}</p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 bg-gray-700 rounded-lg text-center shadow-lg">
              <p className="text-lg text-gray-300">Total Employees</p>
              <p className="text-3xl font-bold text-purple-400">{stats.totalEmployees}</p>
            </div>
            <div className="p-6 bg-gray-700 rounded-lg text-center shadow-lg">
              <p className="text-lg text-gray-300">Total Admins</p>
              <p className="text-3xl font-bold text-purple-400">{stats.totalAdmins}</p>
            </div>
          </div>
        </div>
      )}

      {/* Working Hours Section */}
      <div className="mt-8 w-full max-w-6xl bg-gray-800 p-6 rounded-lg shadow-xl border border-purple-600">
        <h3 className="text-2xl font-bold text-purple-300 mb-4">Set Working Hours</h3>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex flex-col">
            <label className="mb-1 text-gray-300">Start Time</label>
            <input 
              type="time" 
              className="p-3 bg-gray-700 text-white rounded" 
              value={workingHours.start} 
              onChange={(e) => setWorkingHours({ ...workingHours, start: e.target.value })} 
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-gray-300">End Time</label>
            <input 
              type="time" 
              className="p-3 bg-gray-700 text-white rounded" 
              value={workingHours.end} 
              onChange={(e) => setWorkingHours({ ...workingHours, end: e.target.value })} 
            />
          </div>
        </div>

        {/* Shift Management */}
        <h3 className="text-2xl font-bold text-purple-300 mt-6 mb-4">Manage Shifts</h3>
        <div className="mb-4 max-h-60 overflow-y-auto">
          {shifts.length === 0 ? (
            <p className="text-gray-400 italic">No shifts defined yet</p>
          ) : (
            shifts.map((shift, index) => (
              <div key={index} className="flex justify-between p-3 bg-gray-700 rounded mb-2">
                <p>{shift.name}: {shift.start} - {shift.end}</p>
                <button className="bg-red-500 px-3 py-1 rounded" onClick={() => removeShift(index)}>Remove</button>
              </div>
            ))
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <input 
            type="text" 
            placeholder="Shift Name" 
            className="p-3 bg-gray-700 text-white rounded" 
            value={newShift.name} 
            onChange={(e) => setNewShift({ ...newShift, name: e.target.value })} 
          />
          <input 
            type="time" 
            className="p-3 bg-gray-700 text-white rounded" 
            value={newShift.start} 
            onChange={(e) => setNewShift({ ...newShift, start: e.target.value })} 
          />
          <input 
            type="time" 
            className="p-3 bg-gray-700 text-white rounded" 
            value={newShift.end} 
            onChange={(e) => setNewShift({ ...newShift, end: e.target.value })} 
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            className="bg-green-500 px-4 py-2 rounded hover:bg-green-600 transition" 
            onClick={addShift}
          >
            Add Shift
          </button>
          <button 
            className={`bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 transition ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`} 
            onClick={updateSettings}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </div>

      {/* Employee Management Section */}
      <div className="mt-8 w-full max-w-6xl bg-gray-800 p-6 rounded-lg shadow-xl border border-purple-600">
        <h3 className="text-2xl font-bold text-purple-300 mb-4">Employee Management</h3>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search Employees..."
          className="w-full p-3 mb-4 rounded bg-gray-700 text-white"
          value={searchQuery}
          onChange={(e) => filterEmployees(e.target.value)}
        />

        <button
          onClick={fetchEmployees}
          className={`px-4 py-2 mb-4 ${loading ? 'bg-gray-600' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition`}
          disabled={loading}
        >
          {loading ? 'Loading...' : showEmployees ? 'Hide Employees' : 'Show Employees'}
        </button>

        {/* Employee List */}
        {showEmployees && (
          <div className="space-y-4">
            {paginatedEmployees.length === 0 ? (
              <p className="text-gray-400 italic text-center py-4">No employees found</p>
            ) : (
              paginatedEmployees.map((emp) => (
                <div key={emp._id} className="flex justify-between p-3 bg-gray-700 rounded-lg">
                  <p>{emp.name} - {emp.email}</p>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
                      onClick={() => setEditingEmployee(emp)}
                    >
                      Edit
                    </button>
                    <button
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
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
                  className={`px-3 py-1 ${currentPage === 1 ? "bg-gray-600" : "bg-purple-500 hover:bg-purple-600"} text-white rounded transition`}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>
                <span className="px-3 py-1 bg-gray-700 text-white rounded">
                  Page {currentPage}
                </span>
                <button
                  className={`px-3 py-1 ${filteredEmployees.length <= currentPage * employeesPerPage ? "bg-gray-600" : "bg-purple-500 hover:bg-purple-600"} text-white rounded transition`}
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

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold text-purple-300 mb-4">Edit Employee</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full p-2 bg-gray-700 text-white rounded"
                  value={editingEmployee.name}
                  onChange={(e) => setEditingEmployee({...editingEmployee, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full p-2 bg-gray-700 text-white rounded"
                  value={editingEmployee.email}
                  onChange={(e) => setEditingEmployee({...editingEmployee, email: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                  onClick={() => setEditingEmployee(null)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
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
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold text-red-400 mb-4">Confirm Delete</h3>
            <p className="mb-6">
              Are you sure you want to delete employee: <span className="font-semibold">{deletingEmployee.name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                onClick={() => setDeletingEmployee(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                onClick={deleteEmployee}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}