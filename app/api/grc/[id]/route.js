// import dbConnect from '@/lib/db';
// import { Grc } from '@/lib/grc';
// import { BarcodeLabel } from '@/lib/barcodeLabel';

// const json = (data, status = 200) => Response.json(data, { status });

// /* GET /api/grc/[id]
//    Returns { grc, rows } - the GRC header plus every barcode row linked to
//    it (grcId). Used by both the "Print GRC" and "Barcode print" pages so
//    they don't each need their own fetch logic. */
// export async function GET(_req, { params }) {
//   await dbConnect();
//   const { id } = params;

//   const grc = await Grc.findById(id).lean();
//   if (!grc) return json({ error: 'GRC not found' }, 404);

//   const rows = await BarcodeLabel.find({ grcId: id }).sort({ createdAt: 1 }).lean();

//   return json({
//     grc: { ...grc, _id: String(grc._id) },
//     rows: rows.map((r) => ({ ...r, _id: String(r._id) })),
//   });
// }

// /* DELETE /api/grc/[id]
//    Removes the GRC header and every barcode row linked to it - the
//    list's "Delete" action for a GRC row. */
// export async function DELETE(_req, { params }) {
//   await dbConnect();
//   const { id } = params;

//   await Promise.all([
//     Grc.findByIdAndDelete(id),
//     BarcodeLabel.deleteMany({ grcId: id }),
//   ]);

//   return json({ ok: true });
// }




import dbConnect from '@/lib/db';
import Grc from '@/models/Grc';
import { BarcodeLabel } from '@/lib/barcodeLabel';

const json = (data, status = 200) => Response.json(data, { status });

export async function GET(_req, { params }) {
  await dbConnect();
  const { id } = params;

  const grc = await Grc.findById(id).lean();
  if (!grc) return json({ error: 'GRC not found' }, 404);

  const rows = await BarcodeLabel.find({ grcId: id }).sort({ createdAt: 1 }).lean();

  return json({
    grc: { ...grc, _id: String(grc._id) },
    rows: rows.map((r) => ({ ...r, _id: String(r._id) })),
  });
}

export async function DELETE(_req, { params }) {
  await dbConnect();
  const { id } = params;

  await Promise.all([
    Grc.findByIdAndDelete(id),
    BarcodeLabel.deleteMany({ grcId: id }),
  ]);

  return json({ ok: true });
}