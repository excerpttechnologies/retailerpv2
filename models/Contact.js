import mongoose from 'mongoose';
import { buildContactSchema, LABEL_FIELD, LEGACY_CONTACT_COLLECTION } from './contactSchema.js';

/* LEGACY - the shared `contact` collection, where suppliers, customers and
   agents lived together told apart by `contactKind`.

   Nothing in the application imports this model directly any more. Every
   reader and writer goes through lib/contacts.js, which hands back this model
   only while CONTACT_STORAGE is not `split` (lib/contactStorage.js), and the
   kind's own model - models/Supplier.js, Customer.js, Agent.js - once it is.

   It is kept, unchanged in what it reads and writes, because `contact` is the
   source and the rollback target of
   scripts/migrateContactsToSeparateCollections.mjs, and it stays the backup
   until the split has been verified and the business retires it. Do not drop
   the collection and do not delete this file before then.

   The fields are the shared set in ./contactSchema.js - the same set the
   three kind models use - so a record copied either way keeps every field. */

export { LABEL_FIELD };

const ContactSchema = buildContactSchema();

/* One supplier per GST NO within a business - the rule as this collection has
   always enforced it: only records marked Supplier, and only those with a GST
   number, since customers and agents share the collection. The kind-specific
   form of the same rule is on models/Supplier.js. */
export const SUPPLIER_GST_INDEX = {
  key: { businessId: 1, gstNo: 1 },
  options: {
    name: 'supplier_gstNo_unique',
    unique: true,
    partialFilterExpression: { contactKind: 'Supplier', gstNo: { $gt: '' } },
    collation: { locale: 'en', strength: 2 },
  },
};
ContactSchema.index(SUPPLIER_GST_INDEX.key, SUPPLIER_GST_INDEX.options);

export default mongoose.models.contact ||
  mongoose.model('contact', ContactSchema, LEGACY_CONTACT_COLLECTION);
