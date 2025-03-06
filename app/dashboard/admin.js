"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [showEmployees, setShowEmployees] = useState(false);
  const [loading, setLoading] = useState(false);

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
      console.error("Error fetching stats:", error);
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

  return (
    <div className="p-6 text-white min-h-screen bg-gray-900">
      <h2 className="text-3xl font-extrabold mb-6 text-center text-purple-400">Admin Dashboard</h2>

      {stats && (
        <div className="max-w-3xl mx-auto bg-gray-800 p-6 rounded-lg shadow-lg">
          <p className="text-xl font-semibold text-purple-300">Company ID: <span className="text-white">{stats.companyId}</span></p>
          <div className="flex justify-between mt-4">
            <div className="p-4 bg-gray-700 rounded-lg text-center w-1/2 mr-2">
              <p className="text-lg text-gray-300">Total Employees</p>
              <p className="text-2xl font-bold text-purple-400">{stats.totalEmployees}</p>
            </div>
            <div className="p-4 bg-gray-700 rounded-lg text-center w-1/2 ml-2">
              <p className="text-lg text-gray-300">Total Admins</p>
              <p className="text-2xl font-bold text-purple-400">{stats.totalAdmins}</p>
            </div>
          </div>

          <button
            onClick={fetchEmployees}
            className="mt-6 w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition duration-300"
          >
            {showEmployees ? "Hide Employees" : "View Employees"}
          </button>
        </div>
      )}

      {/* Employee List */}
      {showEmployees && (
        <div className="mt-6 max-w-5xl mx-auto bg-gray-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-2xl font-bold text-purple-300 text-center mb-4">Employee List</h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-gray-700 rounded-lg overflow-hidden">
              <thead className="bg-gray-600">
                <tr>
                  <th className="p-3 text-left text-purple-300">Name</th>
                  <th className="p-3 text-left text-purple-300">Email</th>
                  <th className="p-3 text-left text-purple-300">Company ID</th>
                </tr>
              </thead>
              <tbody>
                {employees.length > 0 ? (
                  employees.map((employee) => (
                    <tr key={employee._id} className="border-b border-gray-600 hover:bg-gray-600 transition">
                      <td className="p-3">{employee.name}</td>
                      <td className="p-3">{employee.email}</td>
                      <td className="p-3">{employee.companyId}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="p-3 text-center text-gray-400">
                      No employees found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
