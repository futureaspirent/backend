import express from "express";

import auth from "../middlewares/auth.js";
import Product from "../models/Product.js";
import Invoice from "../models/Invoice.js";
import Purchase from "../models/Purchase.js";

const router = express.Router();

router.post("/sale", auth, async (req, res) => {
  const { productId, quantity, customerName, dueDate } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ msg: "Product not found" });

    if (product.quantity < quantity)
      return res.status(400).json({ msg: "Insufficient stock" });

    product.quantity -= quantity;
    await product.save();

    const amount = quantity * product.price;

    const invoice = new Invoice({
      items: [
        {
          product: product._id,
          name: product.name,
          quantity,
          price: product.price,
        },
      ],
      amount,
      customerName,
      dueDate,
      owner: req.user, 
    });

    await invoice.save();

    res.json({ msg: "Sale recorded", invoice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/purchase", auth, async (req, res) => {
  const { items } = req.body; 

  try {
    let totalValue = 0;
    const purchaseItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) continue;

      product.quantity += item.quantity;
      await product.save();

      const cost = item.costPrice || product.price;
      totalValue += item.quantity * cost;

      purchaseItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        costPrice: cost,
      });
    }

    const purchase = new Purchase({
      items: purchaseItems,
      totalValue,
      owner: req.user, 
    });

    await purchase.save();

    res.json({ msg: "Purchase recorded", purchase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
