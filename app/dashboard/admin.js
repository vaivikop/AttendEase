"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [showEmployees, setShowEmployees] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

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

    try {
      const res = await fetch("/api/admin/employees");
      const data = await res.json();

      if (res.ok) {
        setEmployees(data.employees);
        setShowEmployees(true);
        toast.success("Employee list loaded!");
      } else {
        toast.error("Failed to fetch employees");
      }
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const deleteEmployee = async (id) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;

    try {
      const res = await fetch(`/api/admin/employees/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        setEmployees((prev) => prev.filter((e) => e._id !== id));
        toast.success(data.message || "Employee deleted!");
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

  return (
    <div className="p-6 text-white min-h-screen bg-gray-900 flex flex-col items-center">
      <h2 className="text-4xl font-extrabold mb-6 text-purple-400 drop-shadow-lg">
        Admin Dashboard
      </h2>

      {stats && (
        <div className="max-w-4xl w-full bg-gray-800 p-6 rounded-lg shadow-2xl border border-purple-600">
          <p className="text-xl font-semibold text-purple-300 text-center">
            Company ID: <span className="text-white">{stats.companyId}</span>
          </p>

          <div className="grid grid-cols-2 gap-6 mt-6">
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
            className="mt-6 w-full px-5 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all duration-300 ease-in-out transform hover:scale-105"
          >
            {showEmployees ? "Hide Employees" : "View Employees"}
          </button>
        </div>
      )}

      {showEmployees && (
        <div className="mt-8 w-full max-w-6xl bg-gray-800 p-6 rounded-lg shadow-2xl border border-purple-600">
          <h3 className="text-3xl font-bold text-purple-300 text-center mb-6">
            Manage Employees
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-gray-700 rounded-lg overflow-hidden text-sm sm:text-lg">
              <thead className="bg-gray-600">
                <tr>
                  <th className="p-4 text-left text-purple-300">Name</th>
                  <th className="p-4 text-left text-purple-300">Email</th>
                  <th className="p-4 text-left text-purple-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr
                    key={e._id}
                    className="border-b border-gray-600 hover:bg-gray-600 transition-all duration-200 ease-in-out"
                  >
                    <td className="p-4">{e.name}</td>
                    <td className="p-4">{e.email}</td>
                    <td className="p-4 flex flex-wrap gap-2">
                      <button
                        className="px-3 py-1 bg-yellow-500 text-black font-semibold rounded-md hover:bg-yellow-600 transition duration-200"
                        onClick={() => setEditingEmployee(e)}
                      >
                        Edit
                      </button>
                      <button
                        className="px-3 py-1 bg-red-500 text-white font-semibold rounded-md hover:bg-red-600 transition duration-200"
                        onClick={() => deleteEmployee(e._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingEmployee && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-xl font-semibold text-purple-400 mb-4">Edit Employee</h3>
            <input
              type="text"
              className="w-full p-2 rounded bg-gray-700 text-white mb-2"
              value={editingEmployee.name}
              onChange={(e) =>
                setEditingEmployee({ ...editingEmployee, name: e.target.value })
              }
            />
            <input
              type="email"
              className="w-full p-2 rounded bg-gray-700 text-white mb-4"
              value={editingEmployee.email}
              onChange={(e) =>
                setEditingEmployee({ ...editingEmployee, email: e.target.value })
              }
            />
            <button
              className="w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition duration-200"
              onClick={updateEmployee}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
