import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Company from "@/models/Company";
import Attendance from "@/models/Attendance";

export async function GET(req) {
  let session = null;

  if (process.env.NODE_ENV !== "development") {
    session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await connectToDatabase();

    let admin;
    if (session) {
      admin = await User.findOne({ email: session.user.email });
    } else {
      admin = await User.findOne({ role: "admin" });
    }

    if (!admin || admin.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const company = await Company.findOne({ companyId: admin.companyId });
    if (!company) {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }

    const totalEmployees = await User.countDocuments({ companyId: admin.companyId, role: "employee" });
    const totalAdmins = await User.countDocuments({ companyId: admin.companyId, role: "admin" });
    const totalAttendanceRecords = await Attendance.countDocuments({ companyId: admin.companyId });
    
    return Response.json({
      companyId: admin.companyId,
      companyName: company.name,
      totalEmployees,
      totalAdmins,
      totalAttendanceRecords,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}