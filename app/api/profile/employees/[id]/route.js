import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const admin = await User.findOne({ email: session.user.email });

    if (!admin || admin.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, email } = await req.json();
    const employee = await User.findById(params.id);

    if (!employee || employee.companyId !== admin.companyId) {
      return Response.json({ error: "Employee not found" }, { status: 404 });
    }

    employee.name = name || employee.name;
    employee.email = email || employee.email;
    await employee.save();

    return Response.json({ message: "Employee updated successfully" });
  } catch (error) {
    console.error("Error updating employee:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const admin = await User.findOne({ email: session.user.email });

    if (!admin || admin.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const employee = await User.findById(params.id);

    if (!employee || employee.companyId !== admin.companyId) {
      return Response.json({ error: "Employee not found" }, { status: 404 });
    }

    await User.findByIdAndDelete(params.id);
    return Response.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
