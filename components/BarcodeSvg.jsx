'use client';
import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

/* A scannable CODE128 barcode, as an inline SVG.

   This was implemented twice - once in BarcodeLabelSheet.jsx and again in
   app/admin/transaction/purchase/barcode-print/[id]/page.jsx, whose own
   comment flagged the duplication. Both now import this one, and so does
   everything added since (the stock transfer document number, the billing
   document). One implementation means one set of encoding options, so a label
   printed from one screen scans the same as the same label printed from
   another.

   CODE128 because it encodes the full printable ASCII set: the barcode
   numbers this system issues carry a configurable prefix and suffix from the
   Barcode Setting master, and document numbers contain slashes - neither of
   which EAN or UPC can represent.

   JsBarcode is bundled, not loaded from a CDN, so a label still prints when
   the shop's connection is down. */

export default function BarcodeSvg({
  value,
  height = 34,
  width = 1.2,
  displayValue = false,
  fontSize = 12,
  margin = 0,
  className = 'block w-full',
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!value || !ref.current) return;
    try {
      JsBarcode(ref.current, String(value), {
        format: 'CODE128',
        displayValue,
        fontSize,
        height,
        width,
        margin,
      });
    } catch {
      /* CODE128 encodes anything printable; if it still throws - an empty
         string, a control character pasted in - leave the svg empty rather
         than taking the whole sheet or screen down with it. */
    }
  }, [value, height, width, displayValue, fontSize, margin]);

  return <svg ref={ref} className={className} />;
}

/* Named export too: BarcodeLabelSheet exported it by name, and its callers
   still import it that way. */
export { BarcodeSvg };
