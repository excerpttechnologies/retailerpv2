'use client';
import { use } from 'react';
import IcChallanForm from '@/components/IcChallanForm';
import { COMPACT_GRID_COLS } from '../fields';

/* Edit Inter Company Reverse Delivery Challan. */

export default function EditIcReverseDeliveryChallanPage({ params }) {
  const { id } = use(params);
  return (
    <IcChallanForm
      id={id}
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
