import React from 'react';
import PageHeader from '../../../components/ui/PageHeader';

export default function BeneficiarySuperHeader() {
  return (
    <PageHeader
      title="Beneficiaries"
      breadcrumbs={[{ label: 'Beneficiaries', href: '/beneficiary' }]}
      className="beneficiary-super-header"
    />
  );
}
