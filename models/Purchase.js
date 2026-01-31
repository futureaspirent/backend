import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema(
  {
    purchaseId: {
      type: String,
      unique: true,
      required: true,
    },

    productId: {
      type: String,
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const Purchase = mongoose.model("Purchase", purchaseSchema);

export default Purchase;
