'use client';
import TransactionFormView from '@/components/TransactionFormView';
import { FORM } from '../form';

/* Add Goods Receipt Challan */

export default function AddTransactionPurchaseGrcPage() {
  return (
    <TransactionFormView
      cfg={{
        title: "Goods Receiptc Challans",
        addTitle: "Add Goods Receipt Challan",
        basePath: '/admin/',
        slugPath: "transaction/purchase/grc",
        endpoint: '/api/purchase-grc',
        scope: ["business","location","finYear"],
        docType: "Goods Receipt Challan",
        form: FORM,
      }}
    />
  );
}