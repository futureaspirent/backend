import express from "express";
import auth from "../middlewares/auth.js";
import Purchase from "../models/Purchase.js";

const router = express.Router();

router.post("/", auth, async (req, res) => {
  try {
    const { purchaseId, productId, quantity, amount } = req.body;

    if (!purchaseId || !productId || !quantity || amount == null) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    const purchase = await Purchase.create({
      purchaseId,
      productId,
      quantity,
      amount,
      owner: req.user,
    });

    res.status(201).json(purchase);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: "Purchase already exists" });
    }
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});


router.get("/", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const search = req.query.search || "";

    const query = {
      owner: req.user,
      ...(search && { purchaseId: { $regex: search, $options: "i" } }),
    };

    const purchases = await Purchase.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Purchase.countDocuments(query);

    res.json({
      purchases,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});


router.get("/:id", auth, async (req, res) => {
  try {
    const purchase = await Purchase.findOne({
      _id: req.params.id,
      owner: req.user,
    });

    if (!purchase)
      return res.status(404).json({ msg: "Purchase not found" });

    res.json(purchase);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const purchase = await Purchase.findOne({
      _id: req.params.id,
      owner: req.user,
    });

    if (!purchase)
      return res.status(404).json({ msg: "Purchase not found" });

    await purchase.deleteOne();

    res.json({ msg: "Purchase deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});


router.get("/stats/summary", auth, async (req, res) => {
  const result = await Purchase.aggregate([
    { $match: { owner: req.user } },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$amount" },
        totalQuantity: { $sum: "$quantity" },
        count: { $sum: 1 },
      },
    },
  ]);

  res.json({
    totalAmount: result[0]?.totalAmount || 0,
    totalQuantity: result[0]?.totalQuantity || 0,
    totalPurchases: result[0]?.count || 0,
  });
});

router.get("/stats/monthly", auth, async (req, res) => {
  const result = await Purchase.aggregate([
    { $match: { owner: req.user } },
    {
      $group: {
        _id: { month: { $month: "$createdAt" } },
        totalAmount: { $sum: "$amount" },
        totalQuantity: { $sum: "$quantity" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.month": 1 } },
  ]);

  res.json(result);
});

router.get("/stats/products", auth, async (req, res) => {
  const result = await Purchase.aggregate([
    { $match: { owner: req.user } },
    {
      $group: {
        _id: "$productId",
        totalQuantity: { $sum: "$quantity" },
        totalAmount: { $sum: "$amount" },
      },
    },
    { $sort: { totalQuantity: -1 } },
  ]);

  res.json(result);
});

router.get("/stats/top-products", auth, async (req, res) => {
  const limit = Number(req.query.limit) || 5;

  const result = await Purchase.aggregate([
    { $match: { owner: req.user } },
    {
      $group: {
        _id: "$productId",
        totalQuantity: { $sum: "$quantity" },
        totalAmount: { $sum: "$amount" },
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: limit },
  ]);

  res.json(result);
});

export default router;
