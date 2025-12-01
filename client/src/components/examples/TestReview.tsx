import { TestReview } from '../TestReview';

export default function TestReviewExample() {
  const mockApp = {
    id: 'cdr-clinical',
    name: 'CDR Clinical API',
    icon: 'Activity',
    color: 'blue',
  };

  const mockApis = [
    { id: 'ep-1', method: 'GET', path: '/api/v1/patients' },
    { id: 'ep-2', method: 'POST', path: '/api/v1/patients' },
    { id: 'ep-3', method: 'GET', path: '/api/v1/appointments' },
  ];

  const mockConfig = {
    virtualUsers: 500,
    rampUpTime: 30,
    duration: 10,
    thinkTime: 3,
    responseTimeThreshold: 500,
    errorRateThreshold: 1,
  };

  return (
    <div className="p-6">
      <TestReview
        application={mockApp}
        selectedApis={mockApis}
        config={mockConfig}
        onTrigger={() => console.log('Test triggered')}
        onBack={() => console.log('Back clicked')}
      />
    </div>
  );
}
