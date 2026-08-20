// import mongoose from 'mongoose';

// /* Barcode Items
//    Collection name pinned lowercase - Mongoose would pluralise it otherwise
//    and MongoDB collection names are case-sensitive. */

// export const LABEL_FIELD = 'barcodeNo';

// const BarcodeItemSchema = new mongoose.Schema(
//   {
//     businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'business', default: null, index: true },
//     locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'companyLocation', default: null, index: true },
//   },
//   { timestamps: true }
// );

// export default mongoose.models.barcodeItem ||
//   mongoose.model('barcodeItem', BarcodeItemSchema, 'barcodeitem');









import mongoose from 'mongoose';

/* Barcode Items
   One document per barcode actually generated & saved (created inside POST
   /api/barcode-generation, at the same moment a BarcodeLabel row is saved -
   see buildBarcodeItemDocs() there). This model previously had no fields
   beyond business/location scope, which is why the Barcode Items list had
   nothing real to filter or display.

   Ref IDs (itemId, groupId, subGroupId, hsnId, supplierId) are stored rather
   than copied display text, matching resolveRefLabels()'s pattern used
   elsewhere in this app - so if an Item's group or HSN changes later,
   historical barcode rows still point at the right document instead of
   holding a stale name. itemCode and grcNo are the two exceptions: they're
   stored as plain text because the list searches/filters on them directly
   (Item Code column, GRC No filter) and both are already plain strings on
   the source data, not references.

   Collection name pinned lowercase - Mongoose would pluralise it otherwise
   and MongoDB collection names are case-sensitive. */

export const LABEL_FIELD = 'barcodeNo';

const BarcodeItemSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'business', default: null, index: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'companyLocation', default: null, index: true },

    grcId: { type: mongoose.Schema.Types.ObjectId, ref: 'grc', default: null, index: true },
    /* denormalized text, not a ref - GRC No is searched as free text (GRC No
       filter box), same as it already is on the barcode-generation saved
       records search */
    grcNo: { type: String, default: '', index: true },

    /* links back to the exact BarcodeLabel row this came from, so deleting
       one generated row (DELETE /api/barcode-generation with { id }) can
       clean up the matching BarcodeItem instead of leaving an orphan */
    barcodeLabelId: { type: mongoose.Schema.Types.ObjectId, ref: 'barcodeLabel', default: null, index: true },

    barcodeNo: { type: String, default: '', index: true },

    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'item', default: null, index: true },
    /* plain text snapshot of Item.itemCode - see file header for why this
       one isn't ref-resolved like the others */
    itemCode: { type: String, default: '', index: true },

    /* groupId = the parent of whatever Item.subGroupId points to;
       subGroupId = Item.subGroupId itself. If that node has no parent, it
       IS the group (no subgroup layer for this item) - see
       buildBarcodeItemDocs() in /api/barcode-generation for the derivation. */
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'productGroup', default: null, index: true },
    subGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'productGroup', default: null, index: true },

    hsnId: { type: mongoose.Schema.Types.ObjectId, ref: 'hsn', default: null },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'supplier', default: null, index: true },

    cp: { type: Number, default: null },
    rsp: { type: Number, default: null },
    wsp: { type: Number, default: null },
    dp: { type: Number, default: null },

    /* units still available against this specific barcode. Seeded from the
       row's Qty at generation time (1 per UNIQUE row, the batch qty for a
       BATCH row). Nothing decrements it yet - that belongs to the Sell flow
       once it exists. */
    stock: { type: Number, default: 1 },

    /* snapshot of the Item's image at generation time. Per your note, this
       will later be sourced from the mobile app hitting the same DB - kept
       as a plain string path/URL so that swap-in doesn't need a schema
       change. */
    img: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.barcodeItem ||
  mongoose.model('barcodeItem', BarcodeItemSchema, 'barcodeitem');