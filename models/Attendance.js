// /models/Attendance.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    userName: {
      type: String,
      required: true
    },
    companyId: {
      type: String,
      required: true,
      index: true
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    sessions: [
      {
        checkInTime: {
          type: Date,
          required: true
        },
        checkOutTime: {
          type: Date,
          default: null
        },
        duration: {
          type: Number, // Duration in minutes
          default: 0
        },
        status: {
          type: String,
          enum: ['active', 'completed', 'force-closed'],
          default: 'active'
        },
        location: {
          type: String,
          default: 'office'
        },
        notes: {
          type: String,
          default: ''
        }
      }
    ],
    totalDuration: {
      type: Number, // Total minutes worked in a day
      default: 0
    },
    status: {
      type: String,
      enum: ['present', 'late', 'half-day', 'absent', 'weekend', 'holiday'],
      default: 'present'
    },
    lateBy: {
      type: Number, // Minutes late
      default: 0
    },
    earlyDepartureBy: {
      type: Number, // Minutes left early
      default: 0
    },
    overTimeMinutes: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Create compound indexes for faster queries
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ companyId: 1, date: 1 });

// Virtual property to check if currently checked in
attendanceSchema.virtual('isCheckedIn').get(function() {
  if (!this.sessions || this.sessions.length === 0) return false;
  const lastSession = this.sessions[this.sessions.length - 1];
  return lastSession.status === 'active' && lastSession.checkOutTime === null;
});

// Method to calculate total duration for the day
attendanceSchema.methods.calculateTotalDuration = function() {
  let total = 0;
  if (this.sessions && this.sessions.length > 0) {
    this.sessions.forEach(session => {
      total += session.duration || 0;
    });
  }
  this.totalDuration = total;
  return total;
};

// Method to determine attendance status
attendanceSchema.methods.determineStatus = function(workingHoursRequired) {
  // Default required hours in minutes (8 hours)
  const requiredMinutes = workingHoursRequired || 480;
  
  if (this.totalDuration === 0) {
    this.status = 'absent';
  } else if (this.totalDuration < requiredMinutes / 2) {
    this.status = 'half-day';
  } else if (this.lateBy > 30) {
    this.status = 'late';
  } else {
    this.status = 'present';
  }
  
  return this.status;
};

const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);

export default Attendance;