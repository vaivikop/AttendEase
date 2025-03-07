import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import CompanySettings from "@/models/CompanySettings";
import User from "@/models/User";

// ✅ GET Request: Fetch company locations
export async function GET(req) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const user = await User.findOne({ email: session.user.email });
    if (!user) return new Response(JSON.stringify({ error: "User not found" }), { status: 403 });

    const settings = await CompanySettings.findOne({ companyId: user.companyId });
    if (!settings) return new Response(JSON.stringify({ error: "Settings not found" }), { status: 404 });

    return new Response(JSON.stringify({ locations: settings.locations || [] }), { status: 200 });
  } catch (error) {
    console.error("GET locations error:", error);
    return new Response(JSON.stringify({ error: "Server error", details: error.message }), { status: 500 });
  }
}

// ✅ POST Request: Add a new location
export async function POST(req) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const user = await User.findOne({ email: session.user.email });
    if (!user) return new Response(JSON.stringify({ error: "User not found" }), { status: 403 });

    const body = await req.json();
    if (!body.name || !body.policy) {
      return new Response(JSON.stringify({ error: "Location name and policy are required" }), { status: 400 });
    }

    const updatedSettings = await CompanySettings.findOneAndUpdate(
      { companyId: user.companyId },
      { $push: { locations: { name: body.name, policy: body.policy, isActive: true } } },
      { new: true, upsert: true }
    );

    return new Response(JSON.stringify({ message: "Location added successfully", locations: updatedSettings.locations }), { status: 200 });
  } catch (error) {
    console.error("POST locations error:", error);
    return new Response(JSON.stringify({ error: "Server error", details: error.message }), { status: 500 });
  }
}

// ✅ PATCH Request: Update location policy
export async function PATCH(req) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const user = await User.findOne({ email: session.user.email });
    if (!user) return new Response(JSON.stringify({ error: "User not found" }), { status: 403 });

    const body = await req.json();
    if (!body.name || !body.policy) {
      return new Response(JSON.stringify({ error: "Location name and new policy are required" }), { status: 400 });
    }

    const updatedSettings = await CompanySettings.findOneAndUpdate(
      { companyId: user.companyId, "locations.name": body.name },
      { $set: { "locations.$.policy": body.policy } },
      { new: true }
    );

    if (!updatedSettings) return new Response(JSON.stringify({ error: "Location not found" }), { status: 404 });

    return new Response(JSON.stringify({ message: "Location policy updated", locations: updatedSettings.locations }), { status: 200 });
  } catch (error) {
    console.error("PATCH locations error:", error);
    return new Response(JSON.stringify({ error: "Server error", details: error.message }), { status: 500 });
  }
}

// ✅ DELETE Request: Remove a location
export async function DELETE(req) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const user = await User.findOne({ email: session.user.email });
    if (!user) return new Response(JSON.stringify({ error: "User not found" }), { status: 403 });

    const body = await req.json();
    if (!body.name) {
      return new Response(JSON.stringify({ error: "Location name is required" }), { status: 400 });
    }

    const updatedSettings = await CompanySettings.findOneAndUpdate(
      { companyId: user.companyId },
      { $pull: { locations: { name: body.name } } },
      { new: true }
    );

    if (!updatedSettings) return new Response(JSON.stringify({ error: "Location not found" }), { status: 404 });

    return new Response(JSON.stringify({ message: "Location removed", locations: updatedSettings.locations }), { status: 200 });
  } catch (error) {
    console.error("DELETE locations error:", error);
    return new Response(JSON.stringify({ error: "Server error", details: error.message }), { status: 500 });
  }
}
