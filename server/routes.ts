import type { Express } from "express";
import { createServer, type Server } from "http";

// Mock data for test configurations and runs
const mockTestConfigurations = [
  {
    id: "config-1",
    name: "CDR Clinical API Baseline Test",
    applicationId: "cdr-clinical",
    selectedApiIds: ["ep-1", "ep-2", "ep-3"],
    virtualUsers: 100,
    rampUpTime: 30,
    duration: 10,
    thinkTime: 3,
    responseTimeThreshold: 500,
    errorRateThreshold: 1,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "config-2",
    name: "Member Portal API Load Test",
    applicationId: "member-portal",
    selectedApiIds: ["ep-1", "ep-2"],
    virtualUsers: 200,
    rampUpTime: 10,
    duration: 15,
    thinkTime: 2,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const mockTestRuns = [
  {
    id: "run-1",
    testConfigurationId: "config-1",
    status: "completed",
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    results: {
      avgResponseTime: 180,
      p95ResponseTime: 350,
      p99ResponseTime: 480,
      errorRate: 0.5,
      requestsPerSecond: 50,
      totalRequests: 30000,
      successfulRequests: 29850,
      failedRequests: 150,
    },
  },
  {
    id: "run-2",
    testConfigurationId: "config-1",
    status: "completed",
    startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    results: {
      avgResponseTime: 210,
      p95ResponseTime: 390,
      p99ResponseTime: 520,
      errorRate: 0.8,
      requestsPerSecond: 45,
      totalRequests: 27000,
      successfulRequests: 26784,
      failedRequests: 216,
    },
  },
  {
    id: "run-3",
    testConfigurationId: "config-2",
    status: "running",
    startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    completedAt: null,
    results: null,
  },
];

export async function registerRoutes(app: Express): Promise<Server> {
  // Test Configurations CRUD - Mock implementation
  app.get("/api/test-configurations", async (req, res) => {
    res.json(mockTestConfigurations);
  });

  app.get("/api/test-configurations/:id", async (req, res) => {
    const configuration = mockTestConfigurations.find((c) => c.id === req.params.id);
    if (!configuration) {
      return res.status(404).json({ error: "Test configuration not found" });
    }
    res.json(configuration);
  });

  app.post("/api/test-configurations", async (req, res) => {
    const newConfig = {
      id: `config-${Date.now()}`,
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockTestConfigurations.push(newConfig);
    res.status(201).json(newConfig);
  });

  app.put("/api/test-configurations/:id", async (req, res) => {
    const index = mockTestConfigurations.findIndex((c) => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Test configuration not found" });
    }
    mockTestConfigurations[index] = {
      ...mockTestConfigurations[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    res.json(mockTestConfigurations[index]);
  });

  app.delete("/api/test-configurations/:id", async (req, res) => {
    const index = mockTestConfigurations.findIndex((c) => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Test configuration not found" });
    }
    mockTestConfigurations.splice(index, 1);
    res.status(204).send();
  });

  // Test Runs CRUD - Mock implementation
  app.get("/api/test-runs", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const runs = limit ? mockTestRuns.slice(0, limit) : mockTestRuns;
    res.json(runs);
  });

  app.get("/api/test-runs/:id", async (req, res) => {
    const run = mockTestRuns.find((r) => r.id === req.params.id);
    if (!run) {
      return res.status(404).json({ error: "Test run not found" });
    }
    res.json(run);
  });

  app.get("/api/test-configurations/:configId/runs", async (req, res) => {
    const runs = mockTestRuns.filter((r) => r.testConfigurationId === req.params.configId);
    res.json(runs);
  });

  app.post("/api/test-runs", async (req, res) => {
    const newRun = {
      id: `run-${Date.now()}`,
      ...req.body,
      startedAt: new Date().toISOString(),
    };
    mockTestRuns.push(newRun);
    res.status(201).json(newRun);
  });

  app.patch("/api/test-runs/:id", async (req, res) => {
    const index = mockTestRuns.findIndex((r) => r.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Test run not found" });
    }
    mockTestRuns[index] = {
      ...mockTestRuns[index],
      ...req.body,
    };
    res.json(mockTestRuns[index]);
  });

  // GitHub Actions Integration - Dynamic K6 Script Generation
  app.post("/api/github/trigger-workflow", async (req, res) => {
    const { 
      token, 
      testPlan,
      legacyMode = false
    } = req.body;

    if (!token) {
      return res.status(400).json({ error: "GitHub token is required" });
    }

    try {
      let workflowParams;

      if (legacyMode || !testPlan) {
        workflowParams = {
          ref: "master",
          inputs: {
            stage2_duration: "5m",
            stage2_target: "100",
            parallelism: "2",
            test_id: `cael-test-${Date.now()}`,
            test_url: "https://cdr-de-clinical-api.prod.aig.aetna.com/persons/033944599299665$/visits"
          }
        };
      } else {
        const { selectedApis, payloads, config, baseUrl } = testPlan;
        const testId = `test-${Date.now()}`;
        
        const endpointsForK6 = (selectedApis || []).map((api: any) => ({
          id: api.id,
          name: api.description || api.path,
          method: api.method,
          path: api.path,
          category: api.category,
        }));

        const payloadsForK6: Record<string, any[]> = {};
        for (const api of (selectedApis || [])) {
          if (payloads && payloads[api.id] && payloads[api.id].length > 0) {
            payloadsForK6[api.id] = payloads[api.id];
          }
        }

        workflowParams = {
          ref: "master",
          inputs: {
            test_id: testId,
            virtual_users: String(config?.virtualUsers || 100),
            duration: `${config?.duration || 5}m`,
            ramp_up: `${config?.rampUpTime || 30}s`,
            ramp_down: '30s',
            response_threshold_ms: String(config?.responseTimeThreshold || 500),
            error_threshold_percent: String(config?.errorRateThreshold || 1),
            endpoints_json: JSON.stringify(endpointsForK6),
            payloads_base64: Buffer.from(JSON.stringify(payloadsForK6)).toString('base64'),
            base_url: baseUrl || 'https://cdr-de-clinical-api.prod.aig.aetna.com'
          }
        };
      }

      const response = await fetch(
        "https://api.github.com/repos/cvs-health-source-code/cdr-cis-test-image-promotion/actions/workflows/load-test.yml/dispatches",
        {
          method: "POST",
          headers: {
            "Authorization": `token ${token}`,
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(workflowParams),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return res.status(response.status).json({ 
          error: "Failed to trigger workflow", 
          details: error 
        });
      }

      const runsResponse = await fetch(
        "https://api.github.com/repos/cvs-health-source-code/cdr-cis-test-image-promotion/actions/workflows/load-test.yml/runs?per_page=1",
        {
          headers: {
            "Authorization": `token ${token}`,
            "Accept": "application/vnd.github.v3+json",
          },
        }
      );

      const runsData = await runsResponse.json();
      const latestRun = runsData.workflow_runs?.[0];

      res.json({
        success: true,
        message: "Workflow triggered successfully",
        runId: latestRun?.id,
        runUrl: latestRun?.html_url,
        testId: workflowParams.inputs.test_id,
        workflowInputs: workflowParams.inputs,
      });
    } catch (error) {
      console.error("Error triggering workflow:", error);
      res.status(500).json({ 
        error: "Failed to trigger workflow", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Generate K6 script for download
  app.post("/api/k6/generate-script", async (req, res) => {
    const { testPlan } = req.body;
    
    if (!testPlan) {
      return res.status(400).json({ error: "Test plan is required" });
    }
    
    try {
      const { selectedApis, payloads, config, baseUrl } = testPlan;
      
      const endpointsJson = JSON.stringify(
        (selectedApis || []).map((api: any) => ({
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
          (selectedApis || [])
            .filter((api: any) => payloads && payloads[api.id]?.length > 0)
            .map((api: any) => [api.id, payloads[api.id]])
        ),
        null,
        2
      );
      
      const script = `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const requestDuration = new Trend('request_duration');
const requestErrors = new Rate('request_errors');
const requestCount = new Counter('request_count');

// Test configuration
const BASE_URL = '${baseUrl || 'https://your-api-base-url.com'}';

const ENDPOINTS = ${endpointsJson};

const PAYLOADS = ${payloadsJson};

export const options = {
  stages: [
    { duration: '${config?.rampUpTime || 30}s', target: ${config?.virtualUsers || 100} },
    { duration: '${config?.duration || 5}m', target: ${config?.virtualUsers || 100} },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<${config?.responseTimeThreshold || 500}'],
    http_req_failed: ['rate<${(config?.errorRateThreshold || 1) / 100}'],
    request_errors: ['rate<${(config?.errorRateThreshold || 1) / 100}'],
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
      [\`\${endpoint.name} response time < ${config?.responseTimeThreshold || 500}ms\`]: () => duration < ${config?.responseTimeThreshold || 500},
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
  sleep(${config?.thinkTime || 1});
}

export function handleSummary(data) {
  return {
    'results.json': JSON.stringify(data, null, 2),
  };
}
`.trim();
      
      res.json({
        script,
        testId: `test-${Date.now()}`,
        config: {
          virtualUsers: config?.virtualUsers || 100,
          duration: config?.duration || 5,
          rampUpTime: config?.rampUpTime || 30,
          endpoints: (selectedApis || []).length,
        }
      });
    } catch (error) {
      console.error("Error generating K6 script:", error);
      res.status(500).json({ 
        error: "Failed to generate K6 script", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Get GitHub Actions workflow YAML template
  app.get("/api/k6/workflow-template", async (req, res) => {
    const template = `name: CDR Pulse K6 Load Test

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
          else
            echo "{}" > payloads.json
          fi
      
      - name: Generate K6 Script
        run: |
          cat > k6-test.js << 'SCRIPT_EOF'
          import http from 'k6/http';
          import { check, sleep } from 'k6';
          
          const BASE_URL = '\${{ inputs.base_url }}';
          const ENDPOINTS = \${{ inputs.endpoints_json }};
          
          let PAYLOADS = {};
          try {
            PAYLOADS = JSON.parse(open('./payloads.json'));
          } catch (e) {}
          
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
            const ep = PAYLOADS[endpointId] || [];
            return ep.length > 0 ? ep[Math.floor(Math.random() * ep.length)] : null;
          }
          
          export default function () {
            ENDPOINTS.forEach((ep) => {
              const url = BASE_URL + ep.path;
              const method = ep.method.toUpperCase();
              const headers = { 'Content-Type': 'application/json' };
              const payload = getRandomPayload(ep.id);
              
              let res;
              switch (method) {
                case 'POST': res = http.post(url, payload ? JSON.stringify(payload) : null, { headers }); break;
                case 'PUT': res = http.put(url, payload ? JSON.stringify(payload) : null, { headers }); break;
                case 'PATCH': res = http.patch(url, payload ? JSON.stringify(payload) : null, { headers }); break;
                case 'DELETE': res = http.del(url, { headers }); break;
                default: res = http.get(url, { headers });
              }
              check(res, { 'status 2xx': (r) => r.status >= 200 && r.status < 300 });
            });
            sleep(1);
          }
          
          export function handleSummary(data) {
            return { 'results.json': JSON.stringify(data, null, 2) };
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
`;
    
    res.json({ template });
  });

  app.get("/api/github/workflow-status/:runId", async (req, res) => {
    const { runId } = req.params;
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Authorization token required" });
    }

    try {
      const response = await fetch(
        `https://api.github.com/repos/cvs-health-source-code/cdr-cis-test-image-promotion/actions/runs/${runId}`,
        {
          headers: {
            "Authorization": `token ${token}`,
            "Accept": "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch workflow status" });
      }

      const data = await response.json();
      res.json({
        id: data.id,
        status: data.status,
        conclusion: data.conclusion,
        htmlUrl: data.html_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });
    } catch (error) {
      console.error("Error fetching workflow status:", error);
      res.status(500).json({ error: "Failed to fetch workflow status" });
    }
  });

  app.get("/api/github/workflow-artifacts/:runId", async (req, res) => {
    const { runId } = req.params;
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Authorization token required" });
    }

    try {
      // Get artifacts for the workflow run
      const artifactsResponse = await fetch(
        `https://api.github.com/repos/cvs-health-source-code/cdr-cis-test-image-promotion/actions/runs/${runId}/artifacts`,
        {
          headers: {
            "Authorization": `token ${token}`,
            "Accept": "application/vnd.github.v3+json",
          },
        }
      );

      if (!artifactsResponse.ok) {
        return res.status(artifactsResponse.status).json({ error: "Failed to fetch artifacts" });
      }

      const artifactsData = await artifactsResponse.json();
      
      if (artifactsData.total_count === 0) {
        return res.json({ artifacts: [], message: "No artifacts available yet" });
      }

      // Download and parse the first artifact (assuming it contains test results)
      const artifact = artifactsData.artifacts[0];
      const downloadResponse = await fetch(artifact.archive_download_url, {
        headers: {
          "Authorization": `token ${token}`,
          "Accept": "application/vnd.github.v3+json",
        },
      });

      if (!downloadResponse.ok) {
        return res.status(downloadResponse.status).json({ error: "Failed to download artifact" });
      }

      // Return artifact metadata and download URL for client to handle
      res.json({
        artifacts: artifactsData.artifacts.map((a: any) => ({
          id: a.id,
          name: a.name,
          size: a.size_in_bytes,
          createdAt: a.created_at,
          downloadUrl: a.archive_download_url,
        })),
        totalCount: artifactsData.total_count,
      });
    } catch (error) {
      console.error("Error fetching artifacts:", error);
      res.status(500).json({ error: "Failed to fetch artifacts" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
