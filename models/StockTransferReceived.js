import mongoose from 'mongoose';

export const LABEL_FIELD = 'receivedNo';

const ItemLineSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'item', default: null },
    itemCode: { type: String, default: '' },
    itemName: { type: String, default: '' },
    qty: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const StockTransferReceivedSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'business', default: null, index: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'companyLocation', default: null, index: true },
    finYear: { type: String, default: '', index: true },
    packetId: { type: mongoose.Schema.Types.ObjectId, ref: 'stockTransferPacket', default: null, index: true },
    locationIdFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'companyLocation', default: null, index: true },
    locationIdTo: { type: mongoose.Schema.Types.ObjectId, ref: 'companyLocation', default: null, index: true },
    receivedNo: { type: String, default: '', index: true },
    receivedDate: { type: Date, default: null },
    status: { type: String, default: 'Received' },
    items: { type: [ItemLineSchema], default: [] },
    sentQty: { type: Number, default: 0 },
    receivedQty: { type: Number, default: 0 },
    pendingQty: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.stockTransferReceived ||
  mongoose.model('stockTransferReceived', StockTransferReceivedSchema, 'stocktransferreceived');
