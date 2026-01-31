import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

import User from "./models/User.js";
import Product from "./models/Product.js";
import Purchase from "./models/Purchase.js";
import Invoice from "./models/Invoice.js";
import Sale from "./models/Sale.js";

dotenv.config();

const seedAll = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    
    let admin = await User.findOne({ email: process.env.ADMIN_EMAIL });

    if (!admin) {
      const hashedPassword = await bcrypt.hash(
        process.env.ADMIN_PASSWORD,
        10
      );

      admin = await User.create({
        firstName: process.env.ADMIN_FIRSTNAME,
        lastName: process.env.ADMIN_LASTNAME,
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
      });

      console.log("Admin user created");
    } else {
      console.log("Admin already exists");
    }

    const adminId = admin._id;

    await Product.deleteMany({ owner: adminId });
    await Purchase.deleteMany({ owner: adminId });
    await Sale.deleteMany({ owner: adminId });
    await Invoice.deleteMany({ owner: adminId });

    console.log("Old data deleted");

    const productsData = [
      {
        name: "Maggi Noodles 12-pack",
        productId: "PROD-001",
        category: "Food",
        price: 43,
        quantity: 100,
        unit: "packet",
        threshold: 10,
        expiryDate: new Date("2025-12-11"),
        image: "/uploads/maggi.jpg",
        owner: adminId,
      },
      {
        name: "Bru Coffee 100gm",
        productId: "PROD-002",
        category: "Beverages",
        price: 257,
        quantity: 50,
        unit: "gm",
        threshold: 5,
        expiryDate: new Date("2025-12-21"),
        image: "/uploads/bru.jpg",
        owner: adminId,
      },
      {
        name: "Red Bull 250ml",
        productId: "PROD-003",
        category: "Beverages",
        price: 120,
        quantity: 200,
        unit: "bottle",
        threshold: 20,
        expiryDate: new Date("2025-12-31"),
        image: "/uploads/redbull.jpg",
        owner: adminId,
      },
      {
        name: "Basmati Rice 5kg",
        productId: "PROD-004",
        category: "Food",
        price: 1090,
        quantity: 30,
        unit: "bag",
        threshold: 5,
        expiryDate: new Date("2026-01-15"),
        image: "/uploads/rice.jpg",
        owner: adminId,
      },
    ];

    await Product.insertMany(productsData);
    console.log("Products seeded");

    const purchasesData = [
      {
        purchaseId: "PUR-1001",
        productId: "PROD-001",
        quantity: 50,
        amount: 2150,
        owner: adminId,
        createdAt: new Date("2025-09-05"),
      },
      {
        purchaseId: "PUR-1002",
        productId: "PROD-002",
        quantity: 30,
        amount: 7710,
        owner: adminId,
        createdAt: new Date("2025-08-15"),
      },
      {
        purchaseId: "PUR-1003",
        productId: "PROD-003",
        quantity: 100,
        amount: 12000,
        owner: adminId,
        createdAt: new Date("2025-07-22"),
      },
      {
        purchaseId: "PUR-1004",
        productId: "PROD-004",
        quantity: 20,
        amount: 21800,
        owner: adminId,
        createdAt: new Date("2025-06-18"),
      },
    ];

    await Purchase.insertMany(purchasesData);
    console.log("Purchases seeded");

    const salesData = [
      {
        invoiceId: "INV-1001",
        productId: "PROD-001",
        quantity: 10,
        amount: 430,
        owner: adminId,
        createdAt: new Date("2025-09-01"),
      },
      {
        invoiceId: "INV-1001",
        productId: "PROD-002",
        quantity: 5,
        amount: 1285,
        owner: adminId,
        createdAt: new Date("2025-09-01"),
      },
      {
        invoiceId: "INV-1002",
        productId: "PROD-003",
        quantity: 20,
        amount: 2400,
        owner: adminId,
        createdAt: new Date("2025-08-25"),
      },
    ];

    await Sale.insertMany(salesData);
    console.log("Sales seeded");

    const invoicesData = [
      {
        invoiceId: "INV-1001",
        items: [
          { product: "PROD-001", name: "Maggi", quantity: 10, price: 43 },
          { product: "PROD-002", name: "Bru", quantity: 5, price: 257 },
        ],
        amount: 1715,
        dueDate: new Date("2025-09-10"),
        status: "paid",
        owner: adminId,
        createdAt: new Date("2025-09-01"),
      },
      {
        invoiceId: "INV-1002",
        items: [
          { product: "PROD-003", name: "Red Bull", quantity: 20, price: 120 },
        ],
        amount: 2400,
        dueDate: new Date("2025-08-30"),
        status: "paid",
        owner: adminId,
        createdAt: new Date("2025-08-25"),
      },
    ];

    await Invoice.insertMany(invoicesData);
    console.log("Invoices seeded");

    console.log("✅ Seeding completed successfully");
    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
};

seedAll();
