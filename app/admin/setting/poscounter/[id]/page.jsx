'use client';
import { use } from 'react';
import FormView from '@/components/FormView';
import { FIELDS } from '../fields';

/* Edit Pos Counters */

export default function EditPoscounterPage({ params }) {
  const { id } = use(params);

  return (
    <FormView
      id={id}
      cfg={{
        title: "Pos Counters",
        addTitle: "Edit Pos Counters",
        basePath: '/admin/setting/',
        slugPath: "poscounter",
        endpoint: '/api/pos-counter',
        scope: ["business","location"],
        fields: FIELDS,
      }}
    />
  );
}
