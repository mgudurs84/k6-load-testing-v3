import type { ApiEndpoint, TestConfig } from './mock-data';

export interface K6WorkflowInputs {
  test_id: string;
  virtual_users: string;
  duration: string;
  ramp_up: string;
  ramp_down: string;
  response_threshold_ms: string;
  error_threshold_percent: string;
  endpoints_json: string;
  payloads_base64: string;
  base_url: string;
}

export interface K6TestPlan {
  testId: string;
  baseUrl: string;
  selectedApis: ApiEndpoint[];
  payloads: Record<string, any[]>;
  config: TestConfig;
}

export interface PayloadEntry {
  endpointId: string;
  data: any[];
}

export function generateK6WorkflowInputs(plan: K6TestPlan): K6WorkflowInputs {
  const { testId, baseUrl, selectedApis, payloads, config } = plan;

  const endpointsForK6 = selectedApis.map(api => ({
    id: api.id,
    name: api.description || api.path,
    method: api.method,
    path: api.path,
    category: api.category,
  }));

  const payloadsForK6: Record<string, any[]> = {};
  for (const api of selectedApis) {
    if (payloads[api.id] && payloads[api.id].length > 0) {
      payloadsForK6[api.id] = payloads[api.id];
    }
  }

  return {
    test_id: testId,
    virtual_users: String(config.virtualUsers),
    duration: `${config.duration}m`,
    ramp_up: `${config.rampUpTime}s`,
    ramp_down: '30s',
    response_threshold_ms: String(config.responseTimeThreshold || 500),
    error_threshold_percent: String(config.errorRateThreshold || 1),
    endpoints_json: JSON.stringify(endpointsForK6),
    payloads_base64: Buffer.from(JSON.stringify(payloadsForK6)).toString('base64'),
    base_url: baseUrl,
  };
}

export function generateK6Script(plan: K6TestPlan): string {
  const { baseUrl, selectedApis, payloads, config } = plan;

  const endpointsJson = JSON.stringify(
    selectedApis.map(api => ({
      id: api.id,
      name: api.description || api.path,
      method: api.method,
      path: api.path,
    })),
    null,
    2
  );

  const payloadsJson = JSON.stringify(
    Object.fromEntries(
      selectedApis
        .filter(api => payloads[api.id]?.length > 0)
        .map(api => [api.id, payloads[api.id]])
    ),
    null,
    2
  );

  return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const requestDuration = new Trend('request_duration');
const requestErrors = new Rate('request_errors');
const requestCount = new Counter('request_count');

// Test configuration
const BASE_URL = '${baseUrl}';

const ENDPOINTS = ${endpointsJson};

const PAYLOADS = ${payloadsJson};

export const options = {
  stages: [
    { duration: '${config.rampUpTime}s', target: ${config.virtualUsers} },
    { duration: '${config.duration}m', target: ${config.virtualUsers} },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<${config.responseTimeThreshold || 500}'],
    http_req_failed: ['rate<${(config.errorRateThreshold || 1) / 100}'],
    request_errors: ['rate<${(config.errorRateThreshold || 1) / 100}'],
  },
};

function getRandomPayload(endpointId) {
  const endpointPayloads = PAYLOADS[endpointId] || [];
  if (endpointPayloads.length === 0) return null;
  return endpointPayloads[Math.floor(Math.random() * endpointPayloads.length)];
}

function makeRequest(endpoint) {
  const url = BASE_URL + endpoint.path;
  const method = endpoint.method.toUpperCase();
  const headers = { 'Content-Type': 'application/json' };
  const payload = getRandomPayload(endpoint.id);
  
  let response;
  const startTime = Date.now();
  
  try {
    switch (method) {
      case 'POST':
        response = http.post(url, payload ? JSON.stringify(payload) : null, { headers });
        break;
      case 'PUT':
        response = http.put(url, payload ? JSON.stringify(payload) : null, { headers });
        break;
      case 'PATCH':
        response = http.patch(url, payload ? JSON.stringify(payload) : null, { headers });
        break;
      case 'DELETE':
        response = http.del(url, { headers });
        break;
      case 'HEAD':
        response = http.head(url, { headers });
        break;
      case 'OPTIONS':
        response = http.options(url, { headers });
        break;
      default:
        response = http.get(url, { headers });
    }
    
    const duration = Date.now() - startTime;
    requestDuration.add(duration);
    requestCount.add(1);
    
    const success = response.status >= 200 && response.status < 400;
    requestErrors.add(!success);
    
    check(response, {
      [\`\${endpoint.name} status is 2xx/3xx\`]: (r) => r.status >= 200 && r.status < 400,
      [\`\${endpoint.name} response time < ${config.responseTimeThreshold || 500}ms\`]: () => duration < ${config.responseTimeThreshold || 500},
    });
    
    return response;
  } catch (error) {
    requestErrors.add(1);
    console.error(\`Request to \${url} failed: \${error}\`);
    return null;
  }
}

export default function () {
  // Test each endpoint
  ENDPOINTS.forEach((endpoint) => {
    makeRequest(endpoint);
  });
  
  // Think time between iterations
  sleep(${config.thinkTime || 1});
}

export function handleSummary(data) {
  return {
    'results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const metrics = data.metrics;
  let output = '\\n=== K6 Test Summary ===\\n\\n';
  
  output += \`Duration: \${Math.round(data.state.testRunDurationMs / 1000)}s\\n\`;
  output += \`Virtual Users: ${config.virtualUsers}\\n\`;
  output += \`Endpoints Tested: \${ENDPOINTS.length}\\n\\n\`;
  
  if (metrics.http_req_duration) {
    output += \`Response Times:\\n\`;
    output += \`  - Avg: \${Math.round(metrics.http_req_duration.values.avg)}ms\\n\`;
    output += \`  - p95: \${Math.round(metrics.http_req_duration.values['p(95)'])}ms\\n\`;
    output += \`  - p99: \${Math.round(metrics.http_req_duration.values['p(99)'])}ms\\n\\n\`;
  }
  
  if (metrics.http_reqs) {
    output += \`Requests: \${metrics.http_reqs.values.count}\\n\`;
    output += \`RPS: \${Math.round(metrics.http_reqs.values.rate)}\\n\`;
  }
  
  if (metrics.http_req_failed) {
    output += \`Error Rate: \${(metrics.http_req_failed.values.rate * 100).toFixed(2)}%\\n\`;
  }
  
  return output;
}
`.trim();
}

export function generateGitHubActionsYaml(): string {
  return `
name: CDR Pulse K6 Load Test

on:
  workflow_dispatch:
    inputs:
      test_id:
        description: 'Unique test identifier'
        required: true
        type: string
      virtual_users:
        description: 'Target number of virtual users'
        required: true
        default: '100'
      duration:
        description: 'Test duration (e.g., 5m, 30s)'
        required: true
        default: '5m'
      ramp_up:
        description: 'Ramp-up time (e.g., 30s, 1m)'
        required: true
        default: '30s'
      ramp_down:
        description: 'Ramp-down time'
        required: false
        default: '30s'
      response_threshold_ms:
        description: 'Max p95 response time in ms'
        required: true
        default: '500'
      error_threshold_percent:
        description: 'Max error rate percentage'
        required: true
        default: '1'
      endpoints_json:
        description: 'JSON array of API endpoints to test'
        required: true
        type: string
      payloads_base64:
        description: 'Base64-encoded payload data'
        required: false
        type: string
      base_url:
        description: 'Base URL for API endpoints'
        required: true
        type: string

jobs:
  load-test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Decode payloads
        id: payloads
        run: |
          if [ -n "\${{ inputs.payloads_base64 }}" ]; then
            echo "\${{ inputs.payloads_base64 }}" | base64 -d > payloads.json
            echo "has_payloads=true" >> $GITHUB_OUTPUT
          else
            echo "{}" > payloads.json
            echo "has_payloads=false" >> $GITHUB_OUTPUT
          fi
      
      - name: Generate K6 Script
        run: |
          cat > k6-test.js << 'SCRIPT_EOF'
          import http from 'k6/http';
          import { check, sleep } from 'k6';
          import { Counter, Rate, Trend } from 'k6/metrics';
          
          const requestDuration = new Trend('request_duration');
          const requestErrors = new Rate('request_errors');
          const requestCount = new Counter('request_count');
          
          const BASE_URL = '\${{ inputs.base_url }}';
          const ENDPOINTS = \${{ inputs.endpoints_json }};
          
          let PAYLOADS = {};
          try {
            PAYLOADS = JSON.parse(open('./payloads.json'));
          } catch (e) {
            console.log('No payloads file or invalid format');
          }
          
          export const options = {
            stages: [
              { duration: '\${{ inputs.ramp_up }}', target: \${{ inputs.virtual_users }} },
              { duration: '\${{ inputs.duration }}', target: \${{ inputs.virtual_users }} },
              { duration: '\${{ inputs.ramp_down }}', target: 0 },
            ],
            thresholds: {
              http_req_duration: ['p(95)<\${{ inputs.response_threshold_ms }}'],
              http_req_failed: ['rate<0.0\${{ inputs.error_threshold_percent }}'],
            },
          };
          
          function getRandomPayload(endpointId) {
            const endpointPayloads = PAYLOADS[endpointId] || [];
            if (endpointPayloads.length === 0) return null;
            return endpointPayloads[Math.floor(Math.random() * endpointPayloads.length)];
          }
          
          export default function () {
            ENDPOINTS.forEach((endpoint) => {
              const url = BASE_URL + endpoint.path;
              const method = endpoint.method.toUpperCase();
              const headers = { 'Content-Type': 'application/json' };
              const payload = getRandomPayload(endpoint.id);
              
              let response;
              switch (method) {
                case 'POST':
                  response = http.post(url, payload ? JSON.stringify(payload) : null, { headers });
                  break;
                case 'PUT':
                  response = http.put(url, payload ? JSON.stringify(payload) : null, { headers });
                  break;
                case 'PATCH':
                  response = http.patch(url, payload ? JSON.stringify(payload) : null, { headers });
                  break;
                case 'DELETE':
                  response = http.del(url, { headers });
                  break;
                default:
                  response = http.get(url, { headers });
              }
              
              check(response, {
                'status is 2xx': (r) => r.status >= 200 && r.status < 300,
              });
            });
            
            sleep(1);
          }
          
          export function handleSummary(data) {
            return {
              'results.json': JSON.stringify(data, null, 2),
            };
          }
          SCRIPT_EOF
      
      - name: Install K6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Run K6 Load Test
        run: k6 run k6-test.js --out json=k6-output.json
        continue-on-error: true
      
      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: k6-results-\${{ inputs.test_id }}
          path: |
            results.json
            k6-output.json
          retention-days: 30
`.trim();
}
