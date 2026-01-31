import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import nodeCron from "node-cron";

import connectDB from "./config/db.js";
import Product from "./models/Product.js";

import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import statisticsRoutes from "./routes/statisticsRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";

import otpGenerator from "./routes/otpGeneratorRoutes.js";

import saleRoutes from "./routes/saleRoutes.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";

import upload from "./config/upload.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like Postman) or any frontend origin
    callback(null, true);
  },
  credentials: true, // allow cookies or Authorization headers

}));



app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoice", invoiceRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/settings", settingsRoutes);

app.use("/api/otp",otpGenerator);

app.use("/api/sale",saleRoutes);
app.use("/api/purchase",purchaseRoutes);

app.use("/uploads", express.static("uploads"));
app.use("/default", express.static("default"));


nodeCron.schedule("0 0 * * *", async () => {
  console.log("Running daily stock check...");
  const products = await Product.find();
  for (const p of products) {
    console.log(`${p.name}: ${p.status}`);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
