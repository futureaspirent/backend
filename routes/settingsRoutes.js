
import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import auth from "../middlewares/auth.js";

const router = express.Router();


router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

router.put("/me", auth, async (req, res) => {
  try {
    const { firstName, lastName, password } = req.body;

    const user = await User.findById(req.user);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    res.json({
      msg: "Profile updated successfully",
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
