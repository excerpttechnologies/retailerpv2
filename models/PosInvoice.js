import mongoose from 'mongoose';

/* Pos
   Collection name pinned lowercase - Mongoose would pluralise it otherwise
   and MongoDB collection names are case-sensitive. */

export const LABEL_FIELD = 'invoiceNo';

const PosInvoiceSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'business', default: null, index: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'companyLocation', default: null, index: true },
    finYear: { type: String, default: '', index: true },
    date: { type: Date, default: null },
    invoiceNo: { type: String, default: '' },
    counterId: { type: mongoose.Schema.Types.ObjectId, default: null },
    customerId: { type: mongoose.Schema.Types.ObjectId, default: null },
    customerContact: { type: String, default: '' },
    exempted: { type: String, default: '' },
    billingType: { type: String, default: '' },
    paymentStatus: { type: String, default: '' },
    totalAmount: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    sellDue: { type: Number, default: 0 },

    /* line items are free-form per document type */
    items: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.posInvoice ||
  mongoose.model('posInvoice', PosInvoiceSchema, 'posinvoice');
