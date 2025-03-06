import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import User from "@/models/User";

export async function GET(req) {
  try {
    await connectToDatabase();
    
    // Handle development environment - completely bypass auth
    let user;
    let totalAttendance;
    let latestAttendance;
    
    if (process.env.NODE_ENV === "development") {
      // Mock user for development
      user = { 
        _id: "DEV_USER_ID", 
        companyId: "DEV_COMPANY_ID", 
        name: "Dev User", 
        role: "employee",
        email: "dev@example.com"
      };
      
      // Mock attendance data
      const now = new Date();
      const checkInTime = new Date(now);
      checkInTime.setHours(9, 0, 0, 0); // Today at 9 AM
      
      // Sometimes show a checkout time, sometimes don't (to simulate active check-in)
      const includeCheckout = Math.random() > 0.5;
      const checkOutTime = includeCheckout ? new Date(now.setHours(17, 0, 0, 0)) : null; // Today at 5 PM
      
      totalAttendance = 15; // Mock 15 days of attendance
      latestAttendance = {
        checkInTime: checkInTime,
        checkOutTime: checkOutTime
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
      
      // Count total days attended
      totalAttendance = await Attendance.countDocuments({
        userId: user._id
      });
      
      // Get latest check-in
      latestAttendance = await Attendance.findOne({
        userId: user._id
      }).sort({ checkInTime: -1 });
    }
    
    const stats = {
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      totalDaysAttended: totalAttendance,
      lastCheckInTime: latestAttendance?.checkInTime || null,
      lastCheckOutTime: latestAttendance?.checkOutTime || null,
      // Add some extra stats for development
      ...(process.env.NODE_ENV === "development" ? {
        devMode: true,
        mockData: true,
        thisWeekAttendance: 3,
        thisMonthAttendance: 12
      } : {})
    };
    
    return new Response(JSON.stringify(stats), { status: 200 });
  } catch (error) {
    console.error("Stats API error:", error);
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }), 
      { status: 500 }
    );
  }
}