import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
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

    const employees = await User.find({ companyId: admin.companyId, role: "employee" }).select("-password");
    return new Response(JSON.stringify({ employees }), { status: 200 });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
