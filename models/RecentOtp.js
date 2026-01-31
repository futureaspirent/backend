import mongoose from "mongoose";

const recentOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /^\S+@\S+\.\S+$/,
    },

    otp: {
      type: String,
      required: true,
      match: /^\d{6}$/, 
    },

    expiresAt: {
      type: Date,
      default: function () {
        const date = new Date();
        date.setMinutes(date.getMinutes() + 30); 
        return date;
      },
      
    },
  },
  { timestamps: true }
);


recentOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("RecentOtp", recentOtpSchema);
