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

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();

      if (res.ok) {
        setStats(data);
      } else {
        toast.error("Failed to fetch stats");
      }
    } catch (error) {
      toast.error("Something went wrong");
    }
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
      toast.error("Something went wrong");
    }
  };

  const filterEmployees = (query) => {
    setSearchQuery(query);
    setFilteredEmployees(
      employees.filter((e) =>
        e.name.toLowerCase().includes(query.toLowerCase())
      )
    );
  };

  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * employeesPerPage,
    currentPage * employeesPerPage
  );

  return (
    <div className="p-6 text-white min-h-screen bg-gray-900 flex flex-col items-center">
      <h2 className="text-4xl font-extrabold mb-6 text-purple-400 drop-shadow-lg text-center">
        Admin Dashboard
      </h2>

      {stats && (
        <div className="w-full max-w-4xl bg-gray-800 p-6 rounded-lg shadow-2xl border border-purple-600">
          <p className="text-xl font-semibold text-purple-300 text-center">
            Company ID: <span className="text-white">{stats.companyId}</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            <div className="p-6 bg-gray-700 rounded-lg text-center shadow-lg border border-gray-600">
              <p className="text-lg text-gray-300">Total Employees</p>
              <p className="text-3xl font-bold text-purple-400">{stats.totalEmployees}</p>
            </div>
            <div className="p-6 bg-gray-700 rounded-lg text-center shadow-lg border border-gray-600">
              <p className="text-lg text-gray-300">Total Admins</p>
              <p className="text-3xl font-bold text-purple-400">{stats.totalAdmins}</p>
            </div>
          </div>

          <button
            onClick={fetchEmployees}
            className="mt-6 w-full px-5 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all duration-300"
          >
            {showEmployees ? "Hide Employees" : "View Employees"}
          </button>
        </div>
      )}

      {showEmployees && (
        <div className="mt-8 w-full max-w-6xl bg-gray-800 p-6 rounded-lg shadow-2xl border border-purple-600">
          <h3 className="text-2xl font-bold text-purple-300 text-center mb-6">Manage Employees</h3>

          <input
            type="text"
            className="w-full p-3 mb-4 rounded bg-gray-700 text-white"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => filterEmployees(e.target.value)}
          />

          {loading ? (
            <p className="text-center text-purple-400">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-gray-700 rounded-lg text-lg">
                <thead className="bg-gray-600">
                  <tr>
                    <th className="p-4 text-left text-purple-300">Name</th>
                    <th className="p-4 text-left text-purple-300">Email</th>
                    <th className="p-4 text-left text-purple-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map((e) => (
                    <tr key={e._id} className="border-b border-gray-600 hover:bg-gray-600">
                      <td className="p-4">{e.name}</td>
                      <td className="p-4">{e.email}</td>
                      <td className="p-4 flex gap-2">
                        <button className="px-3 py-1 bg-yellow-500 text-black font-semibold rounded-md"
                          onClick={() => setEditingEmployee(e)}>Edit</button>
                        <button className="px-3 py-1 bg-red-500 text-white font-semibold rounded-md"
                          onClick={() => setDeletingEmployee(e)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
