import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import CompanySettings from "@/models/CompanySettings";
import User from "@/models/User";

async function getAdminUser(session) {
  if (process.env.NODE_ENV === "development") {
    return { role: "admin", companyId: "DEV_COMPANY_ID" }; // Bypass auth in development
  }

  if (!session || !session.user.email) return null;
  return await User.findOne({ email: session.user.email });
}

export async function GET(req) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const admin = await getAdminUser(session);

    if (!admin || admin.role !== "admin") {
      return new Response(JSON.stringify({ error: "Access Denied" }), { status: 403 });
    }

    // Fetch settings for the admin's company
    const settings = await CompanySettings.findOne({ companyId: admin.companyId });
    if (!settings) {
      // Return default empty settings instead of error
      return new Response(JSON.stringify({ 
        workingHours: { start: "", end: "" }, 
        shifts: [] 
      }), { status: 200 });
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
    const admin = await getAdminUser(session);

    if (!admin || admin.role !== "admin") {
      return new Response(JSON.stringify({ error: "Access Denied" }), { status: 403 });
    }

    const body = await req.json();
    const { workingHours, shifts } = body;
    
    console.log("Received data:", { workingHours, shifts });
    
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
    let settings = await CompanySettings.findOne({ companyId: admin.companyId });

    if (settings) {
      // Update using findOneAndUpdate for atomic operation
      const updated = await CompanySettings.findOneAndUpdate(
        { companyId: admin.companyId },
        { 
          $set: { 
            workingHours: workingHours,
            shifts: shifts 
          } 
        },
        { new: true }
      );
      
      console.log("Updated settings:", updated);
    } else {
      // Create new settings
      settings = new CompanySettings({
        companyId: admin.companyId,
        workingHours,
        shifts,
      });
      await settings.save();
      console.log("Created new settings:", settings);
    }

    return new Response(JSON.stringify({ message: "Settings updated successfully" }), { status: 200 });
  } catch (error) {
    console.error("POST settings error:", error);
    return new Response(JSON.stringify({ error: `Server error: ${error.message}` }), { status: 500 });
  }
}