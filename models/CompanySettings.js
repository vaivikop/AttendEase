import mongoose from "mongoose";

const companySettingsSchema = new mongoose.Schema(
  {
    companyId: {
      type: String,
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    workingHours: {
      start: {
        type: String,
        default: "09:00",
      },
      end: {
        type: String,
        default: "17:00",
      },
      requiredHoursPerDay: {
        type: Number,
        default: 8, // 8 hours in decimal
      },
      flexibleCheckin: {
        type: Boolean,
        default: true,
      },
      graceTimeForLate: {
        type: Number,
        default: 15, // 15 minutes grace period
      },
    },
    breaks: {
      lunchBreak: {
        start: {
          type: String,
          default: "13:00",
        },
        end: {
          type: String,
          default: "14:00",
        },
        duration: {
          type: Number,
          default: 60, // 60 minutes
        },
        isRequired: {
          type: Boolean,
          default: true,
        },
      },
      shortBreaks: {
        count: {
          type: Number,
          default: 2,
        },
        duration: {
          type: Number,
          default: 15, // 15 minutes each
        },
      },
    },
    weekends: {
      type: [Number], // 0 for Sunday, 1 for Monday, etc.
      default: [0, 6], // Saturday and Sunday
    },
    holidays: [
      {
        date: Date,
        name: String,
        isFullDay: {
          type: Boolean,
          default: true,
        },
      },
    ],
    attendanceRules: {
      autoCheckoutEnabled: {
        type: Boolean,
        default: true,
      },
      autoCheckoutTime: {
        type: String,
        default: "23:59",
      },
      allowMultipleSessions: {
        type: Boolean,
        default: true,
      },
      minimumMinutesPerSession: {
        type: Number,
        default: 30,
      },
      overtimeThreshold: {
        type: Number,
        default: 480, // Minutes (8 hours)
      },
      attendanceReportingTimeZone: {
        type: String,
        default: "UTC",
      },
    },
    // New field: Locations and Policies
    locations: [
      {
        name: {
          type: String,
          required: true,
        },
        policy: {
          type: String,
          required: true,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const CompanySettings =
  mongoose.models.CompanySettings ||
  mongoose.model("CompanySettings", companySettingsSchema);

export default CompanySettings;