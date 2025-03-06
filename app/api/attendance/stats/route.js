import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import User from "@/models/User";

export async function GET(req) {
  try {
    let session = null;
    let employee = null;

    if (process.env.NODE_ENV === "development") {
      console.log("🔧 Development Mode: Using dummy user...");

      // Use a dummy employee for development mode
      employee = {
        name: "Demo User",
        email: "demo@company.com",
        role: "employee",
        companyId: "DEMO12345",
        _id: "demo_user_id",
      };
    } else {
      session = await getServerSession(authOptions);

      if (!session || !session.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      await connectToDatabase();
      employee = await User.findOne({ email: session.user.email });

      if (!employee || employee.role !== "employee") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    let totalDaysAttended = 0;
    let lastCheckInTime = null;

    if (process.env.NODE_ENV === "development") {
      totalDaysAttended = 5; // Dummy attendance count
      lastCheckInTime = "2025-03-06T10:00:00.000Z"; // Dummy timestamp
    } else {
      totalDaysAttended = await Attendance.countDocuments({ userId: employee._id });
      const lastCheckIn = await Attendance.findOne({ userId: employee._id })
        .sort({ checkInTime: -1 })
        .select("checkInTime");

      lastCheckInTime = lastCheckIn ? lastCheckIn.checkInTime : null;
    }

    return Response.json({
      name: employee.name,
      role: employee.role,
      companyId: employee.companyId,
      totalDaysAttended,
      lastCheckInTime,
    });
  } catch (error) {
    console.error("❌ Error fetching attendance stats:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
