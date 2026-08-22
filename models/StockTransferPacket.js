import mongoose from 'mongoose';

export const LABEL_FIELD = 'packetNo';

const ItemLineSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'item', default: null },
    itemCode: { type: String, default: '' },
    itemName: { type: String, default: '' },
    hsn: { type: String, default: '' },
    gst: { type: Number, default: 0 },
    qty: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const StockTransferPacketSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'business', default: null, index: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'companyLocation', default: null, index: true },
    finYear: { type: String, default: '', index: true },
    transferFromLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'companyLocation', default: null, index: true },
    transferToLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'companyLocation', default: null, index: true },
    transferFromLocationGstn: { type: String, default: '' },
    transferFromLocationAddress: { type: String, default: '' },
    transferToLocationGstn: { type: String, default: '' },
    transferToLocationAddress: { type: String, default: '' },
    stockPointId: { type: mongoose.Schema.Types.ObjectId, ref: 'stockPoint', default: null },
    packetNo: { type: String, default: '', index: true },
    transferDate: { type: Date, default: null },
    status: { type: String, default: 'Open' },
    waybill: { type: String, default: '' },
    remarks: { type: String, default: '' },
    items: { type: [ItemLineSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.stockTransferPacket ||
  mongoose.model('stockTransferPacket', StockTransferPacketSchema, 'stocktransferpacket');
