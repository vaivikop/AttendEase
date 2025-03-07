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
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const admin = await User.findOne({ email: session.user.email });
    if (!admin || admin.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate") || null;
    const endDate = url.searchParams.get("endDate") || null;

    let filter = { companyId: admin.companyId };
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const attendanceRecords = await Attendance.find(filter).sort({ date: -1 });

    const userIds = attendanceRecords.map(record => record.userId);
    const users = await User.find({ _id: { $in: userIds } }).select("_id name email");

    const userMap = users.reduce((acc, user) => {
      acc[user._id] = { name: user.name, email: user.email };
      return acc;
    }, {});

    const attendanceSummary = {};
    attendanceRecords.forEach(record => {
      if (!attendanceSummary[record.userId]) {
        attendanceSummary[record.userId] = {
          employeeName: userMap[record.userId]?.name || "Unknown",
          employeeEmail: userMap[record.userId]?.email || "Unknown",
          totalSessions: 0,
          totalDuration: 0,
          lateArrivals: 0,
          earlyDepartures: 0,
          overtime: 0,
          lastStatus: "Unknown"
        };
      }

      const summary = attendanceSummary[record.userId];
      summary.totalSessions += record.sessions.length;
      summary.totalDuration += record.totalDuration || 0;
      summary.lateArrivals += record.lateBy > 0 ? 1 : 0;
      summary.earlyDepartures += record.earlyDepartureBy > 0 ? 1 : 0;
      summary.overtime += record.overTimeMinutes || 0;
      summary.lastStatus = record.status;
    });

    return new Response(JSON.stringify({ attendance: Object.values(attendanceSummary) }), { status: 200 });
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
