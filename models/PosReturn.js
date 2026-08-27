import mongoose from 'mongoose';

/* POS Returns
   Collection name pinned lowercase - Mongoose would pluralise it otherwise
   and MongoDB collection names are case-sensitive. */

export const LABEL_FIELD = 'invoiceNo';

const PosReturnSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'business', default: null, index: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'companyLocation', default: null, index: true },
    finYear: { type: String, default: '', index: true },
    date: { type: Date, default: null },
    invoiceNo: { type: String, default: '' },
    parentInvoice: { type: String, default: '' },
    customerId: { type: mongoose.Schema.Types.ObjectId, default: null },
    paymentStatus: { type: String, default: '' },
    totalAmount: { type: Number, default: 0 },
    locationId: { type: mongoose.Schema.Types.ObjectId, default: null },

    /* line items are free-form per document type */
    items: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.posReturn ||
  mongoose.model('posReturn', PosReturnSchema, 'posreturn');
