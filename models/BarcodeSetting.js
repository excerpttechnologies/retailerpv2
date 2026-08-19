import mongoose from 'mongoose';

/* Barcode Settings
   Collection name is pinned lowercase: Mongoose would pluralise it
   otherwise, and MongoDB collection names are case-sensitive. */

export const LABEL_FIELD = 'name';

const BarcodeSettingSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'business', default: null, index: true },
    finYear: { type: String, default: '', index: true },
    type: { type: String, default: "Periodic" },
    subType: { type: String, default: "Monthly" },
    periods: {
      type: [new mongoose.Schema({
        periodLabel: { type: String, default: '' },
      prefix: { type: String, default: '' },
      suffix: { type: String, default: '' },
      startNumber: { type: Number, default: null },
      numberLenght: { type: Number, default: null },
      sampleBarcode: { type: String, default: '' },
      effectiveDate: { type: Date, default: null },
      expiryDate: { type: Date, default: null },
      }, { _id: false })],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.barcodeSetting ||
  mongoose.model('barcodeSetting', BarcodeSettingSchema, 'barcodesetting');
