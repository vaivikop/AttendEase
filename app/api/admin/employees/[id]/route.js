import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export async function DELETE(req, { params }) {
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

    const { id } = params;
    console.log(`Deleting employee: ${id}`);

    const employee = await User.findOne({ _id: id, companyId: admin.companyId, role: "employee" });
    if (!employee) {
      return new Response(JSON.stringify({ error: "Employee not found" }), { status: 404 });
    }

    await User.deleteOne({ _id: id });
    return new Response(JSON.stringify({ message: "Employee deleted successfully" }), { status: 200 });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}

export async function PATCH(req, { params }) {
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

    const { id } = params;
    console.log(`Updating employee: ${id}`);

    let updateData;
    try {
      updateData = await req.json();
    } catch (error) {
      return new Response(JSON.stringify({ error: "Invalid JSON format" }), { status: 400 });
    }

    const updatedEmployee = await User.findOneAndUpdate(
      { _id: id, companyId: admin.companyId, role: "employee" },
      { $set: updateData },
      { new: true }
    ).select("-password");

    if (!updatedEmployee) {
      return new Response(JSON.stringify({ error: "Employee not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ message: "Employee updated successfully", employee: updatedEmployee }), { status: 200 });
  } catch (error) {
    console.error("Error updating employee:", error);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
