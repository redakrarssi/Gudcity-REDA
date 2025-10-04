import React from 'react';
import { BusinessLayout } from '../../components/business/BusinessLayout';
import { RedemptionVerification } from '../../components/business/RedemptionVerification';

const BusinessDashboard = () => {
  return (
    <BusinessLayout>
      <div className="space-y-6">
        <RedemptionVerification />
      </div>
    </BusinessLayout>
  );
};

export default BusinessDashboard;