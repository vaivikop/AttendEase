import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "employee"],
    required: true,
  },
  companyId: {
    type: String,
    required: true,  // Every user must be linked to a company
  }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model("User", UserSchema);
