import express from "express";
import RecentOtp from "../models/RecentOtp.js";
import User from "../models/User.js";
const router = express.Router();
import nodemailer from "nodemailer";

import {sendOtpEmail} from "../config/mailer.js";

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


router.post("/generate", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ msg: "Email is required" });
  }

  try {
    const userExists = await User.findOne({ email });
    if (!userExists) {
      return res.status(404).json({ msg: "Email not registered" });
    }

    await RecentOtp.findOneAndDelete({ email });

    const otp = generateOtp();

    await sendOtpEmail(email, otp);

    const newOtp = new RecentOtp({ email, otp });
    await newOtp.save();

    res.json({
      msg: "OTP generated successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});



router.post("/verify", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ msg: "Email and OTP are required" });
  }

  try {
    const record = await RecentOtp.findOne({ email });

    if (!record) {
      return res.status(400).json({ msg: "OTP not found or expired" });
    }

    const now = new Date();
    if (record.expiredAt < now) {
      await RecentOtp.findOneAndDelete({ email }); 
      return res.status(400).json({ msg: "OTP has expired" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ msg: "Invalid OTP" });
    }

    await RecentOtp.findOneAndDelete({ email });

    res.json({ msg: "OTP verified successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});


export default router;
