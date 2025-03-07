import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import CompanySettings from "@/models/CompanySettings";
import User from "@/models/User";

async function getUser(session) {
  if (!session || !session.user?.email) return null;
  return await User.findOne({ email: session.user.email });
}

// ✅ Handle GET Request (Fetch Company Settings)
export async function GET(req) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);

    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized: No Session Found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await getUser(session);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized: User not found" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const settings = await CompanySettings.findOne({ companyId: user.companyId });
    if (!settings) {
      return new Response(JSON.stringify({ error: "Settings not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(settings), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GET settings error:", error);
    return new Response(JSON.stringify({ error: "Server error", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ✅ Handle POST Request (Update Company Settings)
export async function POST(req) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);

    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized: No Session Found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await getUser(session);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized: User not found" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log("Received settings update request:", body);

    // Validate request body fields
    if (!body.workingHours || !body.breaks || !body.weekends || !body.attendanceRules) {
      return new Response(JSON.stringify({ error: "Missing required fields in request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const updateFields = {
      workingHours: {
        start: body.workingHours.start || "09:00",
        end: body.workingHours.end || "17:00",
        requiredHoursPerDay: body.requiredHoursPerDay || 8,
        flexibleCheckin: body.flexibleCheckIn, // Fixed field name
        graceTimeForLate: body.gracePeriod || 15, // Fixed field name
      },
      breaks: body.breaks || { lunchBreak: {}, shortBreaks: {} },
      weekends: body.weekends || [0, 6],
      holidays: body.holidays || [],
      attendanceRules: {
        autoCheckoutEnabled: body.attendanceRules?.autoCheckoutEnabled ?? true,
        autoCheckoutTime: body.attendanceRules?.autoCheckoutTime || "23:59",
        allowMultipleSessions: body.attendanceRules?.allowMultipleSessions ?? true,
        minimumMinutesPerSession: body.attendanceRules?.minimumMinutesPerSession || 30,
        overtimeThreshold: body.attendanceRules?.overtimeThreshold || 480,
        attendanceReportingTimeZone: body.attendanceRules?.attendanceReportingTimeZone || "UTC",
      },
      locations: body.locations || [],
    };

    console.log("Updating company settings with:", updateFields);

    const settings = await CompanySettings.findOneAndUpdate(
      { companyId: user.companyId },
      { $set: updateFields },
      { new: true, upsert: true }
    );

    return new Response(JSON.stringify({ message: "Settings updated successfully", settings }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("POST settings error:", error);
    return new Response(JSON.stringify({ error: "Server error", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
