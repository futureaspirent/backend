import express from "express";
import auth from "../middlewares/auth.js";
import Sale from "../models/Sale.js";
import Invoice from "../models/Invoice.js";
import Product from "../models/Product.js";

const router = express.Router();


router.post("/buy", auth, async (req, res) => {
  try {
    const { productId, quantity, invoiceId } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      throw new Error("Invalid input");
    }

    const product = await Product.findOneAndUpdate(
      {
        productId,
        owner: req.user,
        quantity: { $gte: quantity }
      },
      { $inc: { quantity: -quantity } },
      { new: true }
    );

    if (!product) {
      throw new Error("Insufficient stock or product not found");
    }

    const amount = quantity * product.price;

    let invoice;

    if (invoiceId) {
      invoice = await Invoice.findOne({
        invoiceId,
        owner: req.user
      });

      if (!invoice) throw new Error("Invoice not found");
    } else {


      const lastInvoice = await Invoice.findOne({ owner: req.user })
  .sort({ createdAt: -1 })
  .select("invoiceId");

let nextInvoiceNumber = 1000;

if (lastInvoice && lastInvoice.invoiceId) {
  const lastNumber = parseInt(lastInvoice.invoiceId.split("-")[1], 10);
  nextInvoiceNumber = lastNumber + 1;
}


const invoice = await Invoice.create({
  invoiceId: `INV-${nextInvoiceNumber}`,
  owner: req.user,
  amount: 0,
});
    }

    const sale = await Sale.create({
      invoiceId: invoice.invoiceId,
      productId: product.productId,
      quantity,
      amount,
      owner: req.user
    });

    invoice.amount += amount;
    await invoice.save();
    
    res.status(201).json({
      msg: "Product added to invoice",
      invoice,
      sale
    });

  } catch (err) {
    console.error(err);

    if (err.code === 11000) {
      return res.status(400).json({
        msg: "Product already exists in this invoice"
      });
    }

    res.status(400).json({ msg: err.message });
  }
});




router.post("/", auth, async (req, res) => {
  try {
    const { invoiceId, productId, quantity, amount } = req.body;

    if (!invoiceId || !productId || !quantity || amount == null) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    const sale = await Sale.create({
      invoiceId,
      productId,
      quantity,
      amount,
      owner: req.user,
    });

    res.status(201).json(sale);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ msg: "Product already exists in this invoice" });
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
      ...(search && {
        $or: [
          { invoiceId: { $regex: search, $options: "i" } },
          { productId: { $regex: search, $options: "i" } },
        ],
      }),
    };

    const sales = await Sale.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Sale.countDocuments(query);

    res.json({
      sales,
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
    const sale = await Sale.findOne({
      _id: req.params.id,
      owner: req.user,
    });

    if (!sale) return res.status(404).json({ msg: "Sale not found" });

    res.json(sale);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});


router.delete("/:id", auth, async (req, res) => {
  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      owner: req.user,
    });

    if (!sale) return res.status(404).json({ msg: "Sale not found" });

    await sale.deleteOne();
    res.json({ msg: "Sale deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

router.get("/stats/summary", auth, async (req, res) => {
  const result = await Sale.aggregate([
    { $match: { owner: req.user } },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$amount" },
        totalQuantity: { $sum: "$quantity" },
        totalSales: { $sum: 1 },
        invoices: { $addToSet: "$invoiceId" },
      },
    },
  ]);

  res.json({
    totalAmount: result[0]?.totalAmount || 0,
    totalQuantity: result[0]?.totalQuantity || 0,
    totalSales: result[0]?.totalSales || 0,
    totalInvoices: result[0]?.invoices?.length || 0,
  });
});

router.get("/stats/monthly", auth, async (req, res) => {
  const result = await Sale.aggregate([
    { $match: { owner: req.user } },
    {
      $group: {
        _id: { month: { $month: "$createdAt" } },
        totalAmount: { $sum: "$amount" },
        totalQuantity: { $sum: "$quantity" },
        salesCount: { $sum: 1 },
      },
    },
    { $sort: { "_id.month": 1 } },
  ]);

  res.json(result);
});

router.get("/stats/by-product", auth, async (req, res) => {
  const result = await Sale.aggregate([
    { $match: { owner: req.user } },
    {
      $group: {
        _id: "$productId",
        totalQuantity: { $sum: "$quantity" },
        totalAmount: { $sum: "$amount" },
        invoices: { $addToSet: "$invoiceId" },
      },
    },
    {
      $project: {
        productId: "$_id",
        totalQuantity: 1,
        totalAmount: 1,
        invoiceCount: { $size: "$invoices" },
        _id: 0,
      },
    },
    { $sort: { totalQuantity: -1 } },
  ]);

  res.json(result);
});

router.get("/stats/top-products", auth, async (req, res) => {
  const limit = Number(req.query.limit) || 5;

  const result = await Sale.aggregate([
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

router.get("/invoice/:invoiceId", auth, async (req, res) => {
  const sales = await Sale.find({
    owner: req.user,
    invoiceId: req.params.invoiceId,
  });

  res.json(sales);
});

export default router;
