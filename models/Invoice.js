import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: String,
      required: true,
      unique: true
    },

    // referenceNumber: {
    //   type: String,
  
    // },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    status: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid"
    },

    issueDate: {
      type: Date,
      default: Date.now
    },

    dueDate: {
      type: Date
    }
  },
  { timestamps: true }
);


invoiceSchema.pre("validate", function () {
  if (!this.dueDate) {
    const due = new Date(this.issueDate || Date.now());
    due.setDate(due.getDate() + 7);
    this.dueDate = due;
  }
});

export default mongoose.model("Invoice", invoiceSchema);
