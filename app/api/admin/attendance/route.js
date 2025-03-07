import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import User from "@/models/User";

export async function GET(req) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const admin = await User.findOne({ email: session.user.email });
    if (!admin || admin.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    // Fetch attendance records for the company
    const attendanceRecords = await Attendance.find({ companyId: admin.companyId }).sort({ date: -1 });

    // Fetch employee names and map to attendance records
    const userIds = attendanceRecords.map(record => record.userId);
    const users = await User.find({ _id: { $in: userIds } }).select("_id name");
    
    const userMap = users.reduce((acc, user) => {
      acc[user._id] = user.name;
      return acc;
    }, {});

    // Aggregate attendance data
    const attendanceSummary = {};
    attendanceRecords.forEach(record => {
      if (!attendanceSummary[record.userId]) {
        attendanceSummary[record.userId] = {
          employeeName: userMap[record.userId] || "Unknown",
          totalSessions: 0,
          totalDuration: 0,
          lateArrivals: 0,
          earlyDepartures: 0,
          overtime: 0,
          lastStatus: "Unknown"
        };
      }

      const summary = attendanceSummary[record.userId];
      summary.totalSessions += 1;
      summary.totalDuration += record.totalDuration || 0;
      if (record.attendanceStatus === "Late") summary.lateArrivals += 1;
      if (record.attendanceStatus === "Early Departure") summary.earlyDepartures += 1;
      summary.overtime += record.overtime || 0;
      summary.lastStatus = record.attendanceStatus;
    });

    return new Response(JSON.stringify({ attendance: Object.values(attendanceSummary) }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
