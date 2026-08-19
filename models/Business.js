import mongoose from 'mongoose';

/* Business
   Collection name is pinned lowercase: Mongoose would pluralise it
   otherwise, and MongoDB collection names are case-sensitive. */

export const LABEL_FIELD = 'name';

const BusinessSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    businessPrintName: { type: String, default: '' },
    landmark: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    addressLine1: { type: String, default: '' },
    addressLine2: { type: String, default: '' },
    mobile: { type: String, default: '' },
    alternateContactNumber: { type: String, default: '' },
    email: { type: String, default: '' },
    websiteUrl: { type: String, default: '' },
    gstin: { type: String, default: '' },
    isActive: { type: String, default: "Active" },
    currency: { type: String, default: '' },
    timezone: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.business ||
  mongoose.model('business', BusinessSchema, 'business');
