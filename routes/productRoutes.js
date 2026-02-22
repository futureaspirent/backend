import express from "express";
import fs from "fs";
import mongoose from "mongoose";

import Product from "../models/Product.js";
import uploadImage from "../config/upload.js";
import auth from "../middlewares/auth.js";
import Sale from "../models/Sale.js";
import uploadCsv from "../config/uploadCsv.js";

const router = express.Router();

router.get("/summary",auth,async(req,res)=>{

  try{
    const userId=new mongoose.Types.ObjectId(req.user);
    


      const categories = await Product.distinct("category", { owner: userId });
      const totalCategories = categories.length;


      
      const inventoryAgg = await Product.aggregate([
        { $match: { owner: userId } },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: "$quantity" },
            totalValue: {
              $sum: { $multiply: ["$price", "$quantity"] }
            }
          }
        }
      ]);
      
      const totalProductsQuantity = inventoryAgg[0]?.totalQuantity || 0;
      const totalProductsValue = inventoryAgg[0]?.totalValue || 0;

      
      const topSellingAgg = await Sale.aggregate([
        { $match: { owner: userId } },
        {
          $group: {
            _id: "$productId",
            sold: { $sum: "$quantity" },
            revenue: { $sum: "$amount" }
          },
        },
        { $sort: { sold: -1 } },
        { $limit: 6 },
        {
          $group: {
            _id: null,
            top6TotalAmount: { $sum: "$revenue" }
          }
        }
      ]);


      const top6TotalAmount = topSellingAgg[0]?.top6TotalAmount || 0;

      
      const stockAgg = await Product.aggregate([
        { $match: { owner: userId } },
        {
          $group: {
            _id: null,
            lowStock: {
              $sum: {
                $cond: [
                  { $and: [{ $gt: ["$quantity", 0] }, { $lte: ["$quantity", "$threshold"] }] },
                  1,
                  0
                ]
              }
            },
            outOfStock: {
              $sum: {
                $cond: [{ $eq: ["$quantity", 0] }, 1, 0]
              }
            }
          }
        }
      ]);


      const lowStockCount = stockAgg[0]?.lowStock || 0;
      const outOfStockCount = stockAgg[0]?.outOfStock || 0;


      res.json({
        totalCategories,
        totalProductsQuantity,
        totalProductsValue,
        top6TotalAmount,
        lowStockCount,
        outOfStockCount
      });


  } catch (err) {
      res.status(500).json({ msg: err.message });
    }
});


router.get("/", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const search = req.query.search || "";

    const query = {
      owner: req.user,
      ...(search && {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { productId: { $regex: search, $options: "i" } },
        ],
      }),
    };

    const products = await Product.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);


    
      res.json({
        products,
        total,
        page,
        totalPages: Math.ceil(total / limit),

        
      });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  });






router.post("/", auth, uploadImage.single("image"), async (req, res) => {
  try {
    const image = req.file
      ? `/uploads/user_${req.user}/${req.file.filename}`
      : "/default/product.png";

      
    const product = new Product({
      name: req.body.name,
      productId: req.body.productId,
      category: req.body.category,
      price: Number(req.body.price),
      quantity: Number(req.body.quantity),
      unit: req.body.unit,
      expiryDate: req.body.expiryDate,
      threshold: Number(req.body.threshold),
      imageUrl:image,
      owner: req.user,
    });
    
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});


router.post(
  "/bulk",
  auth,
  uploadCsv.single("csvFile"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ msg: "No CSV file uploaded" });
    }

    try {
      const fileData = fs.readFileSync(req.file.path, "utf8");

      const lines = fileData.split("\n").filter((l) => l.trim() !== "");
      const headers = lines[0].split(",").map((h) => h.trim());

      const results = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        const row = {};

        headers.forEach((header, index) => {
          row[header] = values[index];
        });

        const required = [
          "name",
          "productId",
          "category",
          "price",
          "quantity",
          "unit",
          "threshold",
        ];

        for (const field of required) {
          if (!row[field]) {
            errors.push({
              row: i + 1,
              error: `${field} is missing`,
            });
          }
        }

        ["price", "quantity", "threshold"].forEach((f) => {
          if (isNaN(Number(row[f]))) {
            errors.push({
              row: i + 1,
              error: `${f} must be a number`,
            });
          } else {
            row[f] = Number(row[f]);
          }
        });

        if (!/^[A-Z0-9]+$/.test(row.productId)) {
          errors.push({
            row: i + 1,
            error: "productId must be uppercase alphanumeric",
          });
        }

        const exists = await Product.findOne({
          productId: row.productId,
          owner: req.user,
        });

        if (exists) {
          errors.push({
            row: i + 1,
            error: "productId already exists",
          });
        }

        row.owner = req.user;
        results.push(row);
      }

      fs.unlinkSync(req.file.path);

      if (errors.length > 0) {
        return res.status(400).json({
          msg: "Validation failed",
          errors,
        });
      }

      await Product.insertMany(results);

      res.json({
        msg: "Bulk upload successful",
        total: results.length,
      });
    } catch (err) {
      fs.unlinkSync(req.file.path);
      res.status(500).json({ msg: err.message });
    }
  }
);





router.put("/:id", auth, uploadImage.single("image"), async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      owner: req.user,
    });

    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    Object.assign(product, req.body);

    if (req.file) {
      product.image = `/uploads/user_${req.user}/${req.file.filename}`;
    }

    product.price = Number(req.body.price);
    product.quantity = Number(req.body.quantity);
    product.threshold = Number(req.body.threshold);

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  const product = await Product.findOneAndDelete({
    _id: req.params.id,
    owner: req.user,
  });

  if (!product) {
    return res.status(404).json({ msg: "Product not found" });
  }

  res.json({ msg: "Product deleted" });
});

export default router;
