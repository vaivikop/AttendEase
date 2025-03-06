import mongoose from "mongoose";

const CompanySettingsSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    unique: true,
  },
  workingHours: {
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  shifts: [
    {
      name: { type: String, required: true },
      start: { type: String, required: true },
      end: { type: String, required: true },
    },
  ],
});

const CompanySettings =
  mongoose.models.CompanySettings || mongoose.model("CompanySettings", CompanySettingsSchema);

export default CompanySettings;
