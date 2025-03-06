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
    checkInTime: {
      type: Date,
      required: true
    },
    checkOutTime: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Create compound index for faster queries
attendanceSchema.index({ userId: 1, checkInTime: 1 });

const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);

export default Attendance;