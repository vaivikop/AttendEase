import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import CompanySettings from "@/models/CompanySettings";
import User from "@/models/User";

async function getUser(session) {
  if (!session || !session.user?.email) return null;
  return await User.findOne({ email: session.user.email });
}

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
    
    // Log the received request body for debugging
    console.log("Received settings update request:", body);

    // Ensure all necessary fields exist before updating
    if (!body.workingHours || !body.breaks || !body.weekends || !body.attendanceRules) {
      return new Response(JSON.stringify({ error: "Missing required fields in request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Correct field mapping to match schema
    const updateFields = {
      workingHours: {
        start: body.workingHours.start || "09:00",
        end: body.workingHours.end || "17:00",
        requiredHoursPerDay: body.requiredHoursPerDay || 8,
        flexibleCheckin: body.flexibleCheckIn !== undefined ? body.flexibleCheckIn : true,
        graceTimeForLate: body.gracePeriod || 15, // Mapped correctly
      },
      breaks: body.breaks,
      weekends: body.weekends,
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
