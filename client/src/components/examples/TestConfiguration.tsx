import { TestConfiguration } from '../TestConfiguration';
import { useState } from 'react';

export default function TestConfigurationExample() {
  const [config, setConfig] = useState({
    virtualUsers: 100,
    rampUpTime: 30,
    duration: 10,
    thinkTime: 3,
    responseTimeThreshold: 500,
    errorRateThreshold: undefined,
  });

  return (
    <div className="p-6">
      <TestConfiguration config={config} onChange={setConfig} />
    </div>
  );
}
