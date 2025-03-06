import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import AdminSettings from "@/models/CompanySettings"; // Model for storing admin-defined settings

export async function POST(req) {
  let session = null;

  // Bypass authentication in development mode
  if (process.env.NODE_ENV === "development") {
    session = { user: { email: "demo@attendease.com" } }; // Demo user
  } else {
    session = await getServerSession(authOptions);
  }

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    // Find employee
    const employee = await User.findOne({ email: session.user.email });

    if (!employee || employee.role !== "employee") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch working hours from AdminSettings
    const settings = await AdminSettings.findOne({ companyId: employee.companyId });

    if (!settings) {
      return Response.json({ error: "Working hours not set by admin" }, { status: 400 });
    }

    const { workingHours } = settings; // Example: { start: "09:00", end: "18:00" }

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Convert working hours to Date format for comparison
    const [startHour, startMinute] = workingHours.start.split(":").map(Number);
    const [endHour, endMinute] = workingHours.end.split(":").map(Number);

    const workStartTime = new Date(now);
    workStartTime.setHours(startHour, startMinute, 0);

    const workEndTime = new Date(now);
    workEndTime.setHours(endHour, endMinute, 0);

    // Restrict Check-In Before Work Start Time
    if (now < workStartTime) {
      return Response.json({ error: "Check-in is not allowed before working hours" }, { status: 400 });
    }

    let attendance = await Attendance.findOne({
      userId: employee._id,
      checkInTime: { $gte: today },
    });

    if (!attendance) {
      // Check-In (Only allowed before the workday ends)
      if (now > workEndTime) {
        return Response.json({ error: "Check-in time is over for today" }, { status: 400 });
      }

      attendance = new Attendance({
        userId: employee._id,
        checkInTime: now,
      });
    } else {
      // Check-Out (Only allowed after work hours start and before work ends)
      if (!attendance.checkOutTime) {
        if (now < workEndTime) {
          return Response.json({ error: "Check-out is only allowed after working hours" }, { status: 400 });
        }
        attendance.checkOutTime = now;
      } else {
        return Response.json({ error: "Already checked out" }, { status: 400 });
      }
    }

    await attendance.save();
    return Response.json({ message: "Attendance updated", attendance });
  } catch (error) {
    console.error("Error marking attendance:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
