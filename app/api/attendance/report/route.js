// /api/attendance/report.js
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import CompanySettings from "@/models/CompanySettings";

export async function GET(req) {
  try {
    await connectToDatabase();
    
    // Handle authorization
    let user;
    let isAdmin = false;
    
    if (process.env.NODE_ENV === "development") {
      // Mock user for development
      user = { 
        _id: "DEV_USER_ID", 
        companyId: "DEV_COMPANY_ID", 
        name: "Dev User",
        email: "dev@example.com",
        role: "admin" // Mock as admin for easy testing
      };
      isAdmin = user.role === "admin" || user.role === "manager";
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
      
      isAdmin = user.role === "admin" || user.role === "manager";
    }
    
    // Get url parameters
    const url = new URL(req.url);
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');
    const userIdParam = url.searchParams.get('userId');
    const reportType = url.searchParams.get('type') || 'summary'; // summary, daily, or detailed
    
    // Verify permission if requesting other user's data
    if (userIdParam && userIdParam !== user._id && !isAdmin) {
      return new Response(JSON.stringify({ error: "Permission denied" }), { status: 403 });
    }
    
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
    
    // Prepare query
    const query = {
      date: { $gte: startDate, $lt: endDate }
    };
    
    // If userId is provided or user is not admin, filter by userId
    if (userIdParam) {
      query.userId = userIdParam;
    } else if (!isAdmin) {
      query.userId = user._id;
    } else if (isAdmin) {
      query.companyId = user.companyId;
    }
    
    // Get company settings
    const settings = await CompanySettings.findOne({ companyId: user.companyId });
    
    // Get attendance records
    let attendanceRecords;
    let usersMap = {};
    let reportData;
    
    // Get user info if admin
    if (isAdmin && !userIdParam) {
      const users = await User.find({ companyId: user.companyId });
      users.forEach(u => {
        usersMap[u._id] = {
          name: u.name,
          email: u.email,
          role: u.role
        };
      });
    }
    
    switch (reportType) {
      case 'summary':
        // Get all attendance records
        attendanceRecords = await Attendance.find(query).sort({ date: -1 });
        
        // Group by userId
        const userSummary = {};
        
        attendanceRecords.forEach(record => {
          if (!userSummary[record.userId]) {
            userSummary[record.userId] = {
              userId: record.userId,
              userName: record.userName,
              email: usersMap[record.userId]?.email || '',
              role: usersMap[record.userId]?.role || '',
              totalDays: 0,
              presentDays: 0,
              lateDays: 0,
              halfDays: 0,
              absentDays: 0,
              totalWorkDuration: 0,
              totalLateMinutes: 0,
              totalEarlyDepartureMinutes: 0,
              totalOvertimeMinutes: 0,
              averageDailyHours: 0,
              sessionsCount: 0
            };
          }
          
          userSummary[record.userId].totalDays++;
          
          switch(record.status) {
            case 'present':
              userSummary[record.userId].presentDays++;
              break;
            case 'late':
              userSummary[record.userId].lateDays++;
              break;
            case 'half-day':
              userSummary[record.userId].halfDays++;
              break;
            case 'absent':
              userSummary[record.userId].absentDays++;
              break;
          }
          
          userSummary[record.userId].totalWorkDuration += record.totalDuration || 0;
          userSummary[record.userId].totalLateMinutes += record.lateBy || 0;
          userSummary[record.userId].totalEarlyDepartureMinutes += record.earlyDepartureBy || 0;
          userSummary[record.userId].totalOvertimeMinutes += record.overTimeMinutes || 0;
          userSummary[record.userId].sessionsCount += record.sessions?.length || 0;
        });
        
        // Calculate averages
        Object.keys(userSummary).forEach(userId => {
          const days = userSummary[userId].totalDays || 1; // Avoid division by zero
          userSummary[userId].averageDailyHours = 
            (userSummary[userId].totalWorkDuration / 60 / days).toFixed(1);
        });
        
        reportData = {
          startDate,
          endDate,
          companyId: user.companyId,
          users: Object.values(userSummary),
          totalEmployees: Object.keys(userSummary).length,
          settings: {
            workingHours: settings?.workingHours || {},
            attendanceRules: settings?.attendanceRules || {}
          }
        };
        break;
        
      case 'daily':
        // Get all attendance records
        attendanceRecords = await Attendance.find(query).sort({ date: 1 });
        
        // Group by date
        const dailySummary = {};
        const dateRange = [];
        
        // Generate date range
        let currentDate = new Date(startDate);
        while (currentDate < endDate) {
          const dateString = currentDate.toISOString().split('T')[0];
          dateRange.push(dateString);
          
          dailySummary[dateString] = {
            date: dateString,
            totalEmployees: isAdmin ? Object.keys(usersMap).length : 1,
            presentCount: 0,
            lateCount: 0,
            halfDayCount: 0,
            absentCount: 0,
            totalWorkHours: 0,
            averageWorkHours: 0,
            totalOvertimeHours: 0
          };
          
          // Next day
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Fill with actual data
        attendanceRecords.forEach(record => {
          const dateString = record.date.toISOString().split('T')[0];
          
          if (dailySummary[dateString]) {
            switch(record.status) {
              case 'present':
                dailySummary[dateString].presentCount++;
                break;
              case 'late':
                dailySummary[dateString].lateCount++;
                break;
              case 'half-day':
                dailySummary[dateString].halfDayCount++;
                break;
              case 'absent':
                dailySummary[dateString].absentCount++;
                break;
            }
            
            dailySummary[dateString].totalWorkHours += (record.totalDuration || 0) / 60;
            dailySummary[dateString].totalOvertimeHours += (record.overTimeMinutes || 0) / 60;
          }
        });
        
        // Calculate averages
        Object.keys(dailySummary).forEach(dateString => {
          const employeeCount = dailySummary[dateString].presentCount + 
                               dailySummary[dateString].lateCount + 
                               dailySummary[dateString].halfDayCount || 1; // Avoid division by zero
          
          dailySummary[dateString].averageWorkHours = 
            (dailySummary[dateString].totalWorkHours / employeeCount).toFixed(1);
        });
        
        reportData = {
          startDate,
          endDate,
          companyId: user.companyId,
          dateRange: dateRange,
          dailyStats: Object.values(dailySummary),
          settings: {
            workingHours: settings?.workingHours || {},
            attendanceRules: settings?.attendanceRules || {}
          }
        };
        break;
        
      case 'detailed':
        // Get attendance records with populated user info if admin
        attendanceRecords = await Attendance.find(query).sort({ date: -1 });
        
        reportData = {
          startDate,
          endDate,
          companyId: user.companyId,
          records: attendanceRecords.map(record => {
            // Add additional user info for admin reports
            if (isAdmin && usersMap[record.userId]) {
              return {
                ...record.toObject(),
                email: usersMap[record.userId].email,
                role: usersMap[record.userId].role
              };
            }
            return record;
          }),
          settings: {
            workingHours: settings?.workingHours || {},
            attendanceRules: settings?.attendanceRules || {}
          }
        };
        break;
        
      default:
        return new Response(JSON.stringify({ error: "Invalid report type" }), { status: 400 });
    }
    
    return new Response(JSON.stringify(reportData), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("Error generating attendance report:", error);
    return new Response(JSON.stringify({ error: "Failed to generate report", details: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}