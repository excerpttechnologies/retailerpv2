'use client';
import IcChallanForm from '@/components/IcChallanForm';
import { COMPACT_GRID_COLS } from '../fields';

/* Add Inter Company Reverse Delivery Challan.
   RDC No is issued by the server on save, so it is not on this form. */

export default function AddIcReverseDeliveryChallanPage() {
  return (
    <IcChallanForm
      cfg={{
        title: 'Inter Company Reverse Delivery Challans',
        addTitle: 'Inter Company Reverse Delivery Challan',
        basePath: '/admin/transaction/intercompanysell/',
        slugPath: 'reversedeliverychallan',
        endpoint: '/api/ic-reverse-delivery-challan',
        scope: ['business', 'location', 'finYear'],
        docNoKey: 'rdcNo',
        docNoLabel: 'RDC No',
        showInfo: false,
        gridCols: COMPACT_GRID_COLS,
        compactGrid: true,
        showTotals: false,
      }}
    />
  );
}
