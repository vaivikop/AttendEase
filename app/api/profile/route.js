import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function GET(req) {
  try {
    console.log("🔹 Connecting to MongoDB...");
    await connectToDatabase();

    // ✅ Get user session
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      console.error("❌ No session user found!");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    console.log("🔹 Fetching User ID:", session.user.id);

    // ✅ Find user in DB (Include Password)
    const user = await User.findById(session.user.id).select("name email companyId password");
    if (!user) {
      console.error("❌ User not found!");
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    // ✅ Mask the password (Show only first & last letter)
    const maskedPassword =
      user.password && user.password.length > 2
        ? user.password[0] + "*".repeat(user.password.length - 2) + user.password.slice(-1)
        : "******";

    console.log("✅ User Data:", user);

    return new Response(
      JSON.stringify({
        name: user.name,
        email: user.email,
        companyId: user.companyId,
        password: maskedPassword, // ✅ Sending masked password
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Profile fetch error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch profile" }), { status: 500 });
  }
}


export async function PUT(req) {
  try {
    console.log("🔹 Connecting to MongoDB...");
    await connectToDatabase();

    // ✅ Get user session
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      console.error("❌ No session user found!");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    console.log("🔹 Session User ID:", session.user.id);

    // ✅ Get request data
    const { name, password } = await req.json();
    console.log("🔹 Incoming Data:", { name, password });

    if (!name && !password) {
      return new Response(JSON.stringify({ error: "Nothing to update" }), { status: 400 });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    console.log("🔹 Update Data:", updateData);

    // ✅ Perform MongoDB update
    const updatedUser = await User.findByIdAndUpdate(session.user.id, updateData, { new: true });

    if (!updatedUser) {
      console.error("❌ User not found or update failed");
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    console.log("✅ Updated User:", updatedUser);

    return new Response(
      JSON.stringify({
        message: "Profile updated successfully!",
        user: { name: updatedUser.name, companyId: updatedUser.companyId },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Profile update error:", error);
    return new Response(JSON.stringify({ error: "Failed to update profile" }), { status: 500 });
  }
}
