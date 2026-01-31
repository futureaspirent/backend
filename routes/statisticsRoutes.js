

import express from "express";
import auth from "../middlewares/auth.js";

import Sale from "../models/Sale.js";
import Purchase from "../models/Purchase.js";
import Product from "../models/Product.js";
import Invoice from "../models/Invoice.js";
import mongoose from "mongoose";


const router = express.Router();


router.get("/dashSummary", auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user);
    const period = req.query.period || "monthly"; 

    let salesGroupStage;
    let purchaseGroupStage;
    let sortStage;

    if (period === "weekly") {
      salesGroupStage = purchaseGroupStage = {
        _id: { day: { $dayOfWeek: "$createdAt" } },
        totalAmount: { $sum: "$amount" },
        totalQuantity: { $sum: "$quantity" }
      };
      sortStage = { "_id.day": 1 };
    } 
    else if (period === "yearly") {
      salesGroupStage = purchaseGroupStage = {
        _id: { year: { $year: "$createdAt" } },
        totalAmount: { $sum: "$amount" },
        totalQuantity: { $sum: "$quantity" }
      };
      sortStage = { "_id.year": 1 };
    } 
    else {
      salesGroupStage = purchaseGroupStage = {
        _id: { month: { $month: "$createdAt" } },
        totalAmount: { $sum: "$amount" },
        totalQuantity: { $sum: "$quantity" }
      };
      sortStage = { "_id.month": 1 };
    }

    const salesChart = await Sale.aggregate([
      { $match: { owner: userId } },
      { $group: salesGroupStage },
      { $sort: sortStage }
    ]);

   
    const purchaseChart = await Purchase.aggregate([
      { $match: { owner: userId } },
      { $group: purchaseGroupStage },
      { $sort: sortStage }
    ]);

    const topSelling = await Sale.aggregate([
      { $match: { owner: userId } },
      {
        $group: {
          _id: "$productId",
          sold: { $sum: "$quantity" },
          revenue: { $sum: "$amount" }
        }
      },
      { $sort: { sold: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "productId",
          as: "product"
        }
      },
      {
        $project: {
          productId: "$_id",
          sold: 1,
          revenue: 1,
          name: { $arrayElemAt: ["$product.name", 0] },
          imageUrl: { $arrayElemAt: ["$product.imageUrl", 0] }
        }
      }
    ]);

    res.json({
      period,
      salesChart,
      purchaseChart,
      topSelling
    });

  } catch (err) {
    console.error("dashSummary error:", err);
    res.status(500).json({ msg: "Failed to load dashboard data" });
  }
});




router.get("/", auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user);

   
    const salesAgg = await Sale.aggregate([
      { $match: { owner: userId } },
      {
        $group: {
          _id: null,
          totalValue: { $sum: "$amount" },
          totalQuantity: { $sum: "$quantity" },
          count: { $sum: 1 },
        },
      },
    ]);

    

    const purchaseAgg = await Purchase.aggregate([
      { $match: { owner: userId } },
      {
        $group: {
          _id: null,
          totalValue: { $sum: "$amount" },
          totalQuantity: { $sum: "$quantity" }
        },
      },
    ]);

    const inventoryAgg = await Product.aggregate([
      { $match: { owner: userId } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: "$quantity" },
          lowStock: {
            $sum: {
              $cond: [{ $lte: ["$quantity", "$threshold"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const totalProducts = await Product.countDocuments({ owner: userId });
    const categories = await Product.distinct("category", { owner: userId });

    const topSelling = await Sale.aggregate([
      { $match: { owner: userId } },
      {
        $group: {
          _id: "$productId",
          sold: { $sum: "$quantity" },
          
        },
      },
      { $sort: { sold: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "productId",
          as: "product",
        },
      },
      {
        $project: {
          sold: 1,
          name: { $arrayElemAt: ["$product.name", 0] },
          image: { $arrayElemAt: ["$product.imageUrl", 0] } 
        },
      },
    ]);

    const monthlySalesAgg = await Sale.aggregate([
      { $match: { owner: userId } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          total: { $sum: "$amount" },
        },
      },
    ]);

    const monthlyPurchaseAgg = await Purchase.aggregate([
      { $match: { owner: userId } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          total: { $sum: "$amount" },
        },
      },
    ]);

    const monthlySales = Array(12).fill(0);
    monthlySalesAgg.forEach((m) => {
      monthlySales[m._id - 1] = m.total;
    });

    const monthlyPurchases = Array(12).fill(0);
    monthlyPurchaseAgg.forEach((m) => {
      monthlyPurchases[m._id - 1] = m.total;
    });

    res.json({
      sales: {
        totalValue: salesAgg[0]?.totalValue || 0,
        count: salesAgg[0]?.count || 0,
        totalQuantity:salesAgg[0]?.totalQuantity || 0
      },
      purchases: {
        totalValue: purchaseAgg[0]?.totalValue || 0,
        totalQuantity:purchaseAgg[0]?.totalQuantity || 0

      },
      inventory: {
        totalItems: inventoryAgg[0]?.totalItems || 0,
        lowStock: inventoryAgg[0]?.lowStock || 0,
      },
      products: {
        total: totalProducts,
        categories: categories.length,
      },
      topSelling,
      monthlySales,
      monthlyPurchases,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Statistics fetch failed" });
  }
});

export default router;
