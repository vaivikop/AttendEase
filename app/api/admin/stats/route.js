import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const admin = await User.findOne({ email: session.user.email });

    if (!admin || admin.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const totalEmployees = await User.countDocuments({ companyId: admin.companyId, role: "employee" });
    const totalAdmins = await User.countDocuments({ role: "admin" });

    return Response.json({
      companyId: admin.companyId,
      totalEmployees,
      totalAdmins,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
