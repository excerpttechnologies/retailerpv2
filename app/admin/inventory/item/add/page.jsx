'use client';
import FormView from '@/components/FormView';
import { FIELDS } from '../fields';

/* Add Item */

export default function AddItemPage() {

  return (
    <FormView
      cfg={{
        title: "Items",
        addTitle: "Add Item",
        basePath: '/admin/inventory/',
        slugPath: "item",
        endpoint: '/api/item',
        scope: ["business"],
        fields: FIELDS,
        extraFormButton: "Add Varient",
      }}
    />
  );
}
