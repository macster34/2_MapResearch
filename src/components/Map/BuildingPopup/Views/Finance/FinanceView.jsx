import React from 'react';
// Import the ComprehensiveMetrics and Costs components
import ComprehensiveMetrics from './ComprehensiveMetrics';
import Costs from './Costs';

function FinanceView() {
  const handleFinance = () => {
    // Logic for handling finance
  };

  return (
    <div>
    

      {/* Add the ComprehensiveMetrics component here */}
      <ComprehensiveMetrics />

      {/* Add the Costs component here */}
      <Costs />
    </div>
  );
}

export default FinanceView;
