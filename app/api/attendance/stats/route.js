// /api/attendance/stats.js
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import CompanySettings from "@/models/CompanySettings";

export async function GET(req) {
  try {
    await connectToDatabase();
    
    // Handle development environment
    let user;
    
    if (process.env.NODE_ENV === "development") {
      // Mock user for development
      user = { 
        _id: "DEV_USER_ID", 
        companyId: "DEV_COMPANY_ID", 
        name: "Dev User",
        email: "dev@example.com",
        role: "employee"
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
    }
    
    // Get url parameters
    const url = new URL(req.url);
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');
    
    // Set default date range to current month if not specified
    const now = new Date();
    const startDate = startDateParam 
      ? new Date(startDateParam) 
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endDateParam 
      ? new Date(endDateParam) 
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Add one day to end date to include the end date in the range
    endDate.setDate(endDate.getDate() + 1);
    
    // Get today's attendance
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayAttendance = await Attendance.findOne({
      userId: user._id,
      date: today
    });
    
    // Get attendance records in date range
    const attendanceRecords = await Attendance.find({
      userId: user._id,
      date: { $gte: startDate, $lt: endDate }
    }).sort({ date: -1 });
    
    // Calculate statistics
    const totalDaysAttended = attendanceRecords.length;
    
    let totalWorkDuration = 0;
    let totalLateMinutes = 0;
    let totalEarlyDepartureMinutes = 0;
    let totalOvertimeMinutes = 0;
    let presentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    
    attendanceRecords.forEach(record => {
      totalWorkDuration += record.totalDuration || 0;
      totalLateMinutes += record.lateBy || 0;
      totalEarlyDepartureMinutes += record.earlyDepartureBy || 0;
      totalOvertimeMinutes += record.overTimeMinutes || 0;
      
      switch(record.status) {
        case 'present':
          presentDays++;
          break;
        case 'late':
          lateDays++;
          break;
        case 'half-day':
          halfDays++;
          break;
        case 'absent':
          absentDays++;
          break;
      }
    });
    
    // Get last check-in/out
    let lastCheckInTime = null;
    let lastCheckOutTime = null;
    let currentSession = null;
    
    if (todayAttendance && todayAttendance.sessions.length > 0) {
      const lastSession = todayAttendance.sessions[todayAttendance.sessions.length - 1];
      lastCheckInTime = lastSession.checkInTime;
      lastCheckOutTime = lastSession.checkOutTime;
      
      if (lastSession.status === 'active') {
        currentSession = {
          startTime: lastSession.checkInTime,
          duration: Math.floor((now - lastSession.checkInTime) / (1000 * 60)),
          location: lastSession.location,
          notes: lastSession.notes
        };
      }
    }
    
    // Calculate attendance trend
    const attendanceTrend = [];
    let currentDate = new Date(startDate);
    
    while (currentDate < endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const record = attendanceRecords.find(r => 
        r.date.toISOString().split('T')[0] === dateString
      );
      
      attendanceTrend.push({
        date: dateString,
        status: record ? record.status : 'absent',
        duration: record ? record.totalDuration : 0,
        sessions: record ? record.sessions.length : 0
      });
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Response
    return new Response(JSON.stringify({
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      email: user.email,
      totalDaysAttended,
      lastCheckInTime,
      lastCheckOutTime,
      currentSession,
      statistics: {
        presentDays,
        lateDays,
        halfDays,
        absentDays,
        totalWorkHours: (totalWorkDuration / 60).toFixed(1),
        totalLateHours: (totalLateMinutes / 60).toFixed(1),
        totalEarlyDepartureHours: (totalEarlyDepartureMinutes / 60).toFixed(1),
        totalOvertimeHours: (totalOvertimeMinutes / 60).toFixed(1),
        attendancePercentage: totalDaysAttended > 0 
          ? (presentDays / totalDaysAttended * 100).toFixed(1) 
          : 0
      },
      attendanceTrend,
      isCheckedIn: todayAttendance ? todayAttendance.isCheckedIn : false,
      todaySessions: todayAttendance ? todayAttendance.sessions : []
    }), { status: 200 });
    
  } catch (error) {
    console.error("Attendance stats API error:", error);
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }), 
      { status: 500 }
    );
  }
}