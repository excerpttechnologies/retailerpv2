import mongoose from 'mongoose';

/* Inter Company REVERSE Delivery Challan.

   Goods going back the other way: from the branch that received them to the
   branch that sent them.

   The shape is deliberately identical to models/IcDeliveryChallan.js - same
   scope, same destination pair, same totals block, same free-form items - so
   the screen can reuse IcChallanForm and the list can reuse ListView.

   WHAT IS NOT HERE YET. No link back to the delivery challan being reversed,
   no stock movement, no hub routing and no rule about what may be reversed.
   Those are the reverse-specific decisions, and they are not made up here:
   the collection exists so the page renders and saves, and the behaviour is
   added once the flow is settled.

   Collection name pinned lowercase - Mongoose would pluralise it otherwise
   and MongoDB collection names are case-sensitive. */

export const LABEL_FIELD = 'rdcNo';

const IcReverseDeliveryChallanSchema = new mongoose.Schema(
  {
    /* source scope - the branch raising the reverse challan */
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'business', default: null, index: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'companyLocation', default: null, index: true },
    finYear: { type: String, default: '', index: true },

    /* destination */
    toBusinessId: { type: mongoose.Schema.Types.ObjectId, ref: 'business', default: null, index: true },
    toLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'companyLocation', default: null },
    customerGstn: { type: String, default: '' },
    customerAddress: { type: String, default: '' },

    rdcNo: { type: String, default: '', index: true },
    dcDate: { type: Date, default: null },

    stockPointId: { type: mongoose.Schema.Types.ObjectId, ref: 'stockPoint', default: null },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'contact', default: null },
    salesPersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'contact', default: null },
    salesTerm: { type: String, default: '' },
    logisticId: { type: mongoose.Schema.Types.ObjectId, ref: 'logistic', default: null },
    customerWaybill: { type: String, default: '' },

    taxableValue: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    roundOffDiscountAmt: { type: Number, default: 0 },
    igstTotal: { type: Number, default: 0 },
    cgstTotal: { type: Number, default: 0 },
    sgstTotal: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    totalQty: { type: Number, default: 0 },
    netValue: { type: Number, default: 0 },

    items: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.icReverseDeliveryChallan ||
  mongoose.model('icReverseDeliveryChallan', IcReverseDeliveryChallanSchema, 'icreversedeliverychallan');
