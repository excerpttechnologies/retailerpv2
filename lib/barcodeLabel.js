import mongoose from 'mongoose';

const barcodeLabelSchema = new mongoose.Schema(
  {
    grcId: { type: String, default: '' },
    supplierId: { type: String, default: '' },
    groupId: { type: String, default: '' },
    oldBarcode: { type: String, default: '' },
    itemCode: { type: String, default: '' },
    batchUnique: { type: String, default: '' },
    billSlNo: { type: String, default: '' },
    seq: { type: String, default: '' },
    dummy: { type: String, default: '' },
    supplierDescription: { type: String, default: '' },
    qty: { type: String, default: '' },
    uom: { type: String, default: '' },
    hsn: { type: String, default: '' },
    purRate: { type: String, default: '' },
    disc: { type: String, default: '' },
    finalNet: { type: String, default: '' },
    gst: { type: String, default: '' },
    printDescription: { type: String, default: '' },
    retailPrice: { type: String, default: '' },
    disc2: { type: String, default: '' },
    offerPrice: { type: String, default: '' },
    wspPrice: { type: String, default: '' },
    dpPrice: { type: String, default: '' },
    fma: { type: String, default: '' },
    silkMark: { type: String, default: '' },
    barcodeGenerated: { type: String, default: '' },

    /* Staff-uploaded product photo. The mobile app used to write these to a
       separate productImage collection; it now writes them straight onto the
       barcode row, which is why they are declared here. Declared rather than
       left implicit so they survive a non-lean read or a .select(). */
    imageUrl: { type: String, default: '' },
    filePath: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    originalName: { type: String, default: '' },

    businessId: { type: String, default: '' },
    locationId: { type: String, default: '' },
    finYear: { type: String, default: '' },
  },
  { timestamps: true }
);

// collection pinned lowercase, same reasoning as lib/grc.js
export const BarcodeLabel =
  mongoose.models.barcodeLabel ||
  mongoose.model('barcodeLabel', barcodeLabelSchema, 'barcodeLabel');