import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId, // Explicitly define _id type
    name: { type: String, required: true }, 
    email: { type: String, required: true, unique: true }, 
    password: { type: String, required: true }, 
    companyId: { type: String, required: true }, 
    role: { type: String, enum: ["admin", "employee"], default: "employee" }, 
    status: { type: String, enum: ["active", "inactive"], default: "active" }, // New field
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);