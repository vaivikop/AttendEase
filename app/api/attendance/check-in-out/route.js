import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import CompanySettings from "@/models/CompanySettings";

export async function POST(req) {
  try {
    await connectToDatabase();
    
    // Handle development environment - completely bypass auth
    let user;
    let settings;
    
    if (process.env.NODE_ENV === "development") {
      // Mock user for development
      user = { 
        _id: "DEV_USER_ID", 
        companyId: "DEV_COMPANY_ID", 
        name: "Dev User",
        email: "dev@example.com",
        role: "employee"
      };
      
      // Mock company settings for development
      settings = {
        workingHours: {
          start: "09:00",
          end: "17:00"
        }
      };
    } else {
      // Production authentication flow
      const session = await getServerSession(authOptions);
      if (!session || !session.user.email) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      }
      user = await User.findOne({ email: session.user.email });
      if (!user) {
        return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
      }
      
      // Get company settings for working hours
      settings = await CompanySettings.findOne({ companyId: user.companyId });
      
      if (!settings || !settings.workingHours || !settings.workingHours.start || !settings.workingHours.end) {
        return new Response(
          JSON.stringify({ error: "Company working hours not configured" }), 
          { status: 400 }
        );
      }
    }
    
    const { action } = await req.json();
    
    if (action === "checkin") {
      // When in development, bypass all validations and time checks
      if (process.env.NODE_ENV === "development") {
        const now = new Date();
        const attendance = {
          _id: "DEV_ATTENDANCE_ID_" + Date.now(),
          userId: user._id,
          userName: user.name,
          companyId: user.companyId,
          checkInTime: now,
          save: async () => attendance
        };
        
        return new Response(
          JSON.stringify({ message: "Checked in successfully (DEV MODE)", attendance }), 
          { status: 200 }
        );
      }
      
      // Production checks below
      
      // Check if already checked in today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingCheckIn = await Attendance.findOne({
        userId: user._id,
        checkInTime: { $gte: today },
        checkOutTime: null
      });
      
      if (existingCheckIn) {
        return new Response(
          JSON.stringify({ error: "You are already checked in" }), 
          { status: 400 }
        );
      }
      
      // Check if current time is within working hours
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const [startHours, startMinutes] = settings.workingHours.start.split(':').map(Number);
      const [endHours, endMinutes] = settings.workingHours.end.split(':').map(Number);
      
      const startMinutesTotal = startHours * 60 + startMinutes;
      const endMinutesTotal = endHours * 60 + endMinutes;
      
      if (currentTime < startMinutesTotal || currentTime > endMinutesTotal) {
        return new Response(
          JSON.stringify({ 
            error: `You can only check in during working hours (${settings.workingHours.start} - ${settings.workingHours.end})` 
          }), 
          { status: 400 }
        );
      }
      
      // Create new attendance record
      const attendance = new Attendance({
        userId: user._id,
        userName: user.name,
        companyId: user.companyId,
        checkInTime: now
      });
      
      await attendance.save();
      
      return new Response(
        JSON.stringify({ message: "Checked in successfully", attendance }), 
        { status: 200 }
      );
    } 
    else if (action === "checkout") {
      // When in development, bypass all validations
      if (process.env.NODE_ENV === "development") {
        const now = new Date();
        const checkInTime = new Date(now);
        checkInTime.setHours(now.getHours() - 8); // 8 hours ago
        
        const attendance = {
          _id: "DEV_ATTENDANCE_ID_" + Date.now(),
          userId: user._id,
          userName: user.name,
          companyId: user.companyId,
          checkInTime: checkInTime,
          checkOutTime: now,
          save: async () => attendance
        };
        
        return new Response(
          JSON.stringify({ message: "Checked out successfully (DEV MODE)", attendance }), 
          { status: 200 }
        );
      }
      
      // Production flow below
      
      // Find active check-in
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const attendance = await Attendance.findOne({
        userId: user._id,
        checkInTime: { $gte: today },
        checkOutTime: null
      });
      
      if (!attendance) {
        return new Response(
          JSON.stringify({ error: "No active check-in found" }), 
          { status: 400 }
        );
      }
      
      // Update with checkout time
      attendance.checkOutTime = new Date();
      await attendance.save();
      
      return new Response(
        JSON.stringify({ message: "Checked out successfully", attendance }), 
        { status: 200 }
      );
    }
    
    return new Response(
      JSON.stringify({ error: "Invalid action" }), 
      { status: 400 }
    );
  } catch (error) {
    console.error("Attendance API error:", error);
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }), 
      { status: 500 }
    );
  }
}