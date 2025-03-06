import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  checkInTime: { type: Date, required: true },
  checkOutTime: { type: Date }, 
}, { timestamps: true });

export default mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);
