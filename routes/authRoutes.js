import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

import User from "../models/User.js";
import RecentOtp from "../models/RecentOtp.js";

dotenv.config();

const router = express.Router();




// Signup
router.post("/signup", async (req, res) => {
  const { fname,lname, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: "User already exists" });

    user = new User({firstName:fname,lastName:lname, email, password });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});


router.post("/login", async (req, res) => {
 

  const { email, password } = req.body;
  try {
   
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
   
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

  
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
   
    let userId=user._id;
    res.json({ token , userId  });
  } catch (err) {
    res.status(500).json({ msg: "Server Issue" });
  }
});

// dont delete
// router.post("/forgot-password", async (req, res) => {
//   const { email } = req.body;

//   try {
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ msg: "User not found" });
//     }

//     const token = crypto.randomBytes(20).toString("hex");

//     user.resetPasswordToken = token;
//     user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
//     await user.save();

//     const transporter = nodemailer.createTransport({
//       host: process.env.MAIL_HOST,
//       port: process.env.MAIL_PORT,
//       auth: {
//         user: process.env.MAIL_USER,
//         pass: process.env.MAIL_PASS,
//       },
//     });

//     const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

//     await transporter.sendMail({
//       from: process.env.MAIL_FROM,
//       to: email,
//       subject: "Password Reset Request",
//       html: `
//         <h2>${}
//         <h3>Password Reset</h3>
//         <p>Click the link below to reset your password:</p>
//         <a href="${resetUrl}">${resetUrl}</a>
//         <p>This link will expire in 1 hour.</p>
//       `,
//     });

//     res.json({ msg: "Reset link sent to email" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ msg: "Server error" });
//   }
// });



router.put("/reset-password", async (req, res) => {
  try {

    
    const user = await User.findOne({
      email:req.body.email
    })

   

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ msg: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
