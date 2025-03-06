import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import CompanySettings from "@/models/CompanySettings";
import User from "@/models/User";

async function getUser(session) {
  if (process.env.NODE_ENV === "development") {
    return { role: "user", companyId: "DEV_COMPANY_ID" }; // Bypass auth in development
  }

  if (!session || !session.user?.email) return null;
  return await User.findOne({ email: session.user.email });
}

export async function GET(req) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const user = await getUser(session);

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Fetch settings for the user's company
    const settings = await CompanySettings.findOne({ companyId: user.companyId });

    if (!settings) {
      return new Response(
        JSON.stringify({ workingHours: { start: "", end: "" }, shifts: [] }),
        { status: 200 }
      );
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

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const body = await req.json();
    const { workingHours, shifts } = body;

    if (!workingHours.start || !workingHours.end) {
      return new Response(JSON.stringify({ error: "Working hours are required" }), { status: 400 });
    }

    if (!Array.isArray(shifts)) {
      return new Response(JSON.stringify({ error: "Shifts must be an array" }), { status: 400 });
    }

    // Validate shift structure
    for (const shift of shifts) {
      if (!shift.name || !shift.start || !shift.end) {
        return new Response(JSON.stringify({ error: "Each shift must have name, start, and end" }), { status: 400 });
      }
    }

    // Find or create company settings
    let settings = await CompanySettings.findOne({ companyId: user.companyId });

    if (settings) {
      await CompanySettings.findOneAndUpdate(
        { companyId: user.companyId },
        { $set: { workingHours, shifts } },
        { new: true }
      );
    } else {
      settings = new CompanySettings({ companyId: user.companyId, workingHours, shifts });
      await settings.save();
    }

    return new Response(JSON.stringify({ message: "Settings updated successfully" }), { status: 200 });
  } catch (error) {
    console.error("POST settings error:", error);
    return new Response(JSON.stringify({ error: `Server error: ${error.message}` }), { status: 500 });
  }
}
