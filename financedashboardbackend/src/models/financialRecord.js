const mongoose = require("mongoose");

const TYPES = Object.freeze({
  INCOME: "income",
  EXPENSE: "expense",
});

const financialRecordSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(TYPES),
    },
    category: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    notes: { type: String, trim: true, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

financialRecordSchema.index({ date: -1 });
financialRecordSchema.index({ category: 1 });
financialRecordSchema.index({ type: 1 });
financialRecordSchema.index({ createdBy: 1 });

module.exports = {
  FinancialRecord: mongoose.model("FinancialRecord", financialRecordSchema),
  RECORD_TYPES: TYPES,
};
