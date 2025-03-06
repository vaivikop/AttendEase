import mongoose from "mongoose";

const CompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  companyId: {
    type: String,
    required: true,
    unique: true,
  },
}, { timestamps: true });

export default mongoose.models.Company || mongoose.model("Company", CompanySchema);
