import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req) {
  let session = null;

  // Bypass authentication in development mode
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
      // In development, use a default admin
      admin = await User.findOne({ role: "admin" });
    }

    if (!admin || admin.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const employees = await User.find({ companyId: admin.companyId, role: "employee" }).select("-password");

    return Response.json({ employees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
