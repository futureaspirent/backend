import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    productId: {
      type: String,
      required: true,
      match: /^[A-Za-z0-9\-]+$/
    },

    name: {
      type: String,
      required: true
    },

    category: {
      type: String,
      required: true
    },

    imageUrl:{
      type:String,
      default: "/default/product.png"
    } ,

    price: {
      type: Number,
      required: true,
      min: 0
    },

    quantity: {
      type: Number,
      required: true,
      min: 0
    },

    unit: {
      type: String,
      required:true
    },

    threshold: {
      type: Number,
      required: true,
      min: 0
    },

    expiryDate: Date
  },
  { timestamps: true }
);

productSchema.index({ owner: 1, productId: 1 }, { unique: true });


productSchema.virtual("status").get(function () {
  if (this.quantity === 0) return "out-of-stock";
  if (this.quantity < this.threshold) return "low-stock";
  return "in-stock";
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

export default mongoose.model("Product", productSchema);
