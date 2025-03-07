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
          end: "17:00",
          flexibleCheckin: true,
          graceTimeForLate: 15,
          requiredHoursPerDay: 8
        },
        attendanceRules: {
          allowMultipleSessions: true,
          minimumMinutesPerSession: 30
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
    
    const { action, location = "office", notes = "" } = await req.json();
    
    // Get current date without time for day-based attendance
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (action === "checkin") {
      // When in development, bypass all validations and time checks
      if (process.env.NODE_ENV === "development") {
        const attendance = await getOrCreateAttendanceRecord(user, today);
        
        // Add new session
        attendance.sessions.push({
          checkInTime: now,
          status: 'active',
          location,
          notes
        });
        
        await attendance.save();
        
        return new Response(
          JSON.stringify({ message: "Checked in successfully (DEV MODE)", attendance }), 
          { status: 200 }
        );
      }
      
      // Production checks below
      
      // Get or create attendance record for today
      const attendance = await getOrCreateAttendanceRecord(user, today);
      
      // Check if already checked in (has active session)
      if (attendance.isCheckedIn) {
        return new Response(
          JSON.stringify({ error: "You are already checked in" }), 
          { status: 400 }
        );
      }
      
      // Check if multiple sessions are allowed
      if (attendance.sessions.length > 0 && !settings.attendanceRules.allowMultipleSessions) {
        return new Response(
          JSON.stringify({ error: "Multiple check-ins are not allowed for your company" }), 
          { status: 400 }
        );
      }
      
      // Check if current time is within working hours (only if flexibleCheckin is false)
      if (!settings.workingHours.flexibleCheckin) {
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
      }
      
      // Calculate if late
      const [startHours, startMinutes] = settings.workingHours.start.split(':').map(Number);
      const startMinutesTotal = startHours * 60 + startMinutes;
      const currentMinutesTotal = now.getHours() * 60 + now.getMinutes();
      
      // If first check-in of the day and after start time + grace period
      if (attendance.sessions.length === 0 && 
          currentMinutesTotal > (startMinutesTotal + settings.workingHours.graceTimeForLate)) {
        attendance.lateBy = currentMinutesTotal - startMinutesTotal;
      }
      
      // Add new session
      attendance.sessions.push({
        checkInTime: now,
        status: 'active',
        location,
        notes
      });
      
      await attendance.save();
      
      return new Response(
        JSON.stringify({ 
          message: "Checked in successfully", 
          attendance,
          isLate: attendance.lateBy > 0,
          lateByMinutes: attendance.lateBy
        }), 
        { status: 200 }
      );
    } 
    else if (action === "checkout") {
      // When in development, bypass all validations
      if (process.env.NODE_ENV === "development") {
        const attendance = await getOrCreateAttendanceRecord(user, today);
        
        if (attendance.sessions.length === 0) {
          // Create a fake session that started 8 hours ago
          const checkInTime = new Date(now);
          checkInTime.setHours(now.getHours() - 8);
          
          attendance.sessions.push({
            checkInTime,
            checkOutTime: now,
            status: 'completed',
            duration: 480, // 8 hours in minutes
            location: 'office',
            notes: 'Auto-generated in dev mode'
          });
        } else {
          // Complete the last session
          const lastSession = attendance.sessions[attendance.sessions.length - 1];
          lastSession.checkOutTime = now;
          lastSession.status = 'completed';
          
          // Calculate duration in minutes
          const durationMs = lastSession.checkOutTime - lastSession.checkInTime;
          lastSession.duration = Math.floor(durationMs / (1000 * 60));
        }
        
        // Calculate total duration and status
        attendance.calculateTotalDuration();
        attendance.determineStatus(settings.workingHours.requiredHoursPerDay * 60);
        
        // Calculate overtime
        const requiredMinutes = settings.workingHours.requiredHoursPerDay * 60;
        attendance.overTimeMinutes = Math.max(0, attendance.totalDuration - requiredMinutes);
        
        await attendance.save();
        
        return new Response(
          JSON.stringify({ 
            message: "Checked out successfully (DEV MODE)", 
            attendance,
            sessionDuration: attendance.sessions[attendance.sessions.length - 1].duration,
            totalDuration: attendance.totalDuration,
            overtime: attendance.overTimeMinutes
          }), 
          { status: 200 }
        );
      }
      
      // Production flow below
      
      // Find attendance record for today
      const attendance = await Attendance.findOne({
        userId: user._id,
        date: today
      });
      
      if (!attendance || !attendance.isCheckedIn) {
        return new Response(
          JSON.stringify({ error: "No active check-in found" }), 
          { status: 400 }
        );
      }
      
      // Update last session with checkout time
      const lastSession = attendance.sessions[attendance.sessions.length - 1];
      lastSession.checkOutTime = now;
      lastSession.status = 'completed';
      
      // Calculate duration in minutes
      const durationMs = lastSession.checkOutTime - lastSession.checkInTime;
      const durationMinutes = Math.floor(durationMs / (1000 * 60));
      
      // Check if session meets minimum duration requirement
      if (durationMinutes < settings.attendanceRules.minimumMinutesPerSession) {
        return new Response(
          JSON.stringify({ 
            error: `Sessions must be at least ${settings.attendanceRules.minimumMinutesPerSession} minutes long` 
          }), 
          { status: 400 }
        );
      }
      
      lastSession.duration = durationMinutes;
      
      // Calculate early departure
      const [endHours, endMinutes] = settings.workingHours.end.split(':').map(Number);
      const endMinutesTotal = endHours * 60 + endMinutes;
      const currentMinutesTotal = now.getHours() * 60 + now.getMinutes();
      
      if (currentMinutesTotal < endMinutesTotal) {
        attendance.earlyDepartureBy = endMinutesTotal - currentMinutesTotal;
      }
      
      // Calculate total duration and status
      attendance.calculateTotalDuration();
      attendance.determineStatus(settings.workingHours.requiredHoursPerDay * 60);
      
      // Calculate overtime
      const requiredMinutes = settings.workingHours.requiredHoursPerDay * 60;
      attendance.overTimeMinutes = Math.max(0, attendance.totalDuration - requiredMinutes);
      
      await attendance.save();
      
      return new Response(
        JSON.stringify({ 
          message: "Checked out successfully", 
          attendance,
          sessionDuration: lastSession.duration,
          totalDuration: attendance.totalDuration,
          overtime: attendance.overTimeMinutes,
          earlyDeparture: attendance.earlyDepartureBy
        }), 
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

// Helper function to get or create attendance record for a day
async function getOrCreateAttendanceRecord(user, date) {
  let attendance = await Attendance.findOne({
    userId: user._id,
    date: date
  });
  
  if (!attendance) {
    attendance = new Attendance({
      userId: user._id,
      userName: user.name,
      companyId: user.companyId,
      date: date,
      sessions: []
    });
  }
  
  return attendance;
}

// Auto-checkout endpoint for cron job
export async function PUT(req) {
  try {
    await connectToDatabase();
    
    const { apiKey } = await req.json();
    
    // Verify API key for cron jobs
    if (apiKey !== process.env.CRON_API_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    
    // Get all companies with auto-checkout enabled
    const companies = await CompanySettings.find({
      "attendanceRules.autoCheckoutEnabled": true
    });
    
    if (!companies || companies.length === 0) {
      return new Response(
        JSON.stringify({ message: "No companies with auto-checkout enabled" }), 
        { status: 200 }
      );
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let autoCheckoutCount = 0;
    
    // Process each company
    for (const company of companies) {
      // Find all active sessions for this company
      const attendances = await Attendance.find({
        companyId: company.companyId,
        date: today,
        "sessions.status": "active"
      });
      
      for (const attendance of attendances) {
        let modified = false;
        
        // Find active sessions and auto-checkout
        attendance.sessions.forEach(session => {
          if (session.status === "active" && !session.checkOutTime) {
            session.checkOutTime = now;
            session.status = "force-closed";
            
            // Calculate duration
            const durationMs = session.checkOutTime - session.checkInTime;
            session.duration = Math.floor(durationMs / (1000 * 60));
            
            modified = true;
            autoCheckoutCount++;
          }
        });
        
        if (modified) {
          // Recalculate totals
          attendance.calculateTotalDuration();
          attendance.determineStatus(company.workingHours.requiredHoursPerDay * 60);
          
          // Calculate overtime
          const requiredMinutes = company.workingHours.requiredHoursPerDay * 60;
          attendance.overTimeMinutes = Math.max(0, attendance.totalDuration - requiredMinutes);
          
          await attendance.save();
        }
      }
    }
    
    return new Response(
      JSON.stringify({ 
        message: "Auto-checkout process completed", 
        processedCount: autoCheckoutCount 
      }), 
      { status: 200 }
    );
  } catch (error) {
    console.error("Auto-checkout error:", error);
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }), 
      { status: 500 }
    );
  }
}