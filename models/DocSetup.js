import mongoose from 'mongoose';

/* Doc Setups
   Collection name is pinned lowercase: Mongoose would pluralise it
   otherwise, and MongoDB collection names are case-sensitive. */

export const LABEL_FIELD = 'documentName';

const DocSetupSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'business', default: null, index: true },
    finYear: { type: String, default: '', index: true },
    documentName: { type: String, default: '' },
    documentType: { type: String, default: '' },
    description: { type: String, default: '' },
    prefix: { type: String, default: '' },
    suffix: { type: String, default: '' },
    autoNumberLength: { type: Number, default: null },
    startFrom: { type: Number, default: null },
    sample: { type: String, default: '' },
    validity: { type: String, default: '' },
    finYear: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.docSetup ||
  mongoose.model('docSetup', DocSetupSchema, 'docsetup');
