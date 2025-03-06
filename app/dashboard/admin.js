export default function AdminDashboard() {
    return (
      <div className="max-w-4xl w-full bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-purple-400 text-center">Admin Dashboard</h2>
        <div className="mt-6 space-y-4">
          <button className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-lg">
            Manage Employees
          </button>
          <button className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-lg">
            View Attendance Records
          </button>
        </div>
      </div>
    );
  }
  