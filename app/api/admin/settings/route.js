import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import CompanySettings from "@/models/CompanySettings";
import User from "@/models/User";
import Company from "@/models/Company";

async function getUser(session) {
  if (process.env.NODE_ENV === "development") {
    return { role: "admin", companyId: "DEV_COMPANY_ID" };
  }

  if (!session || !session.user?.email) return null;
  return await User.findOne({ email: session.user.email });
}

export async function GET(req) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const user = await getUser(session);

    if (!user || user.role !== "admin") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Fetch settings for the user's company
    const settings = await CompanySettings.findOne({ companyId: user.companyId });
    if (!settings) {
      return new Response(JSON.stringify({ error: "Settings not found" }), { status: 404 });
    }

    return new Response(JSON.stringify(settings), { status: 200 });
  } catch (error) {
    console.error("GET settings error:", error);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const user = await getUser(session);

    if (!user || user.role !== "admin") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const body = await req.json();
    const updateFields = {
      workingHours: body.workingHours,
      breaks: body.breaks,
      weekends: body.weekends,
      holidays: body.holidays,
      attendanceRules: {
        autoCheckoutEnabled: body.attendanceRules.autoCheckoutEnabled,
        autoCheckoutTime: body.attendanceRules.autoCheckoutTime,
        allowMultipleSessions: body.attendanceRules.allowMultipleSessions,
        minimumMinutesPerSession: body.attendanceRules.minimumMinutesPerSession,
        overtimeThreshold: body.attendanceRules.overtimeThreshold,
        attendanceReportingTimeZone: body.attendanceRules.attendanceReportingTimeZone,
      },
      locations: body.locations,
    };

    const settings = await CompanySettings.findOneAndUpdate(
      { companyId: user.companyId },
      { $set: updateFields },
      { new: true, upsert: true }
    );

    return new Response(JSON.stringify({ message: "Settings updated successfully", settings }), { status: 200 });
  } catch (error) {
    console.error("POST settings error:", error);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
