import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: String,
      required: true,
      index: true
    },

    productId: {
      type: String,
      required: true,
      index: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    amount: {
      type: Number,
      required: true,
      min: 0
  
    },

    
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

saleSchema.index({ invoiceId: 1, productId: 1 }, { unique: true });

const Sale = mongoose.model("Sale", saleSchema);

export default Sale;
