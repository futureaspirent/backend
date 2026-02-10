import express from "express";
import mongoose from "mongoose";
import auth from "../middlewares/auth.js";
import Invoice from "../models/Invoice.js";
import Sale from "../models/Sale.js";

const router = express.Router();
const oid = (id) => new mongoose.Types.ObjectId(id);


router.get("/", auth, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const match = {
      owner: oid(req.user),
      ...(search && {
        $or: [
          { invoiceId: { $regex: search, $options: "i" } },
          { _id: { $regex: search, $options: "i" } },
        ],
      }),
    };

    const [invoices, total] = await Promise.all([
      Invoice.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Invoice.countDocuments(match),
    ]);

    res.json({
      invoices,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});


router.post("/", auth, async (req, res) => {
  try {
    const { invoiceId,  amount, dueDate, status, items } = req.body;

    if (!invoiceId || !amount || !dueDate) {
      return res.status(400).json({ msg: "Required fields missing" });
    }

    const invoice = await Invoice.create({
      invoiceId,
      amount,
      dueDate,
      status: status || "unpaid",
      items: items || [],
      owner: req.user,
    });

    res.status(201).json(invoice);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: "Invoice already exists" });
    }
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.put("/:id/status", auth, async (req, res) => {
  try {
    
    const { id } = req.params;
    const { status } = req.body;
    if (!["paid", "unpaid"].includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }
   

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, owner: req.user },
      { status },
      { new: true }
    );



    if (!invoice)
      return res.status(404).json({ msg: "Invoice not found" });

    

    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});


router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoice = await Invoice.findOneAndDelete({
      _id: req.params.id,
      owner: req.user,
    });

    if (!invoice)
      return res.status(404).json({ msg: "Invoice not found" });

    res.json({ msg: "Invoice deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});


router.get("/summary/stats", auth, async (req, res) => {
  try {
    const stats = await Invoice.aggregate([
      { $match: { owner: oid(req.user) } },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    res.json({
      totalInvoices: stats[0]?.totalInvoices || 0,
      totalAmount: stats[0]?.totalAmount || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});





router.get("/:id/details", auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid invoice ID" });
    }

    const invoice = await Invoice.findOne({
      _id: id,
      owner: req.user
    }).lean();

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const sales = await Sale.find({
      invoiceId: invoice.invoiceId,
      owner: req.user
    }).lean();

    const items = sales.map(s => ({
      name: s.productId,
      qty: s.quantity,
      price: s.amount
    }));

    res.json({
      ...invoice,
      items
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load invoice details" });
  }
});


export default router;
