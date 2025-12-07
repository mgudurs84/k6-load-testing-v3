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

  // GitHub Actions Integration - CAEL K6 Load Test
  app.post("/api/github/trigger-workflow", async (req, res) => {
    const { 
      token, 
      testPlan
    } = req.body;

    if (!token) {
      return res.status(400).json({ error: "GitHub token is required" });
    }

    try {
      // Extract config from wizard or use defaults
      const config = testPlan?.config || {};
      
      // Build workflow params with simplified inputs
      // Dynamic values from wizard UI, rest are hardcoded
      const workflowParams = {
        ref: "main",
        inputs: {
          stage2_duration: `${config.duration || 5}m`,
          stage2_target: String(config.virtualUsers || 100),
          parallelism: "2",
          test_id: `cael-test-${Date.now()}`,
          test_url: "https://cdr-de-clinical-api.prod.aig.aetna.com/persons/03394459929966658/visits"
        }
      };

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

  // ============================================
  // Pub/Sub API Endpoints (Kafka & Google Pub/Sub)
  // ============================================

  // Store for registered topics and connections (in-memory for demo)
  const pubsubTopics: Map<string, any> = new Map();

  // Test Kafka connection
  app.post("/api/pubsub/kafka/test-connection", async (req, res) => {
    const { bootstrapServers, apiKey, apiSecret, securityProtocol } = req.body;

    if (!bootstrapServers || !apiKey || !apiSecret) {
      return res.status(400).json({ 
        error: "Missing required fields: bootstrapServers, apiKey, apiSecret" 
      });
    }

    try {
      // In production, you would use a Kafka client to test the connection
      // For now, we simulate a connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      res.json({ 
        success: true, 
        message: "Connection to Kafka cluster successful",
        cluster: bootstrapServers.split('.')[0]
      });
    } catch (error) {
      console.error("Kafka connection error:", error);
      res.status(500).json({ 
        error: "Failed to connect to Kafka cluster",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Test Google Pub/Sub connection
  app.post("/api/pubsub/gcp/test-connection", async (req, res) => {
    const { projectId, credentialsJson } = req.body;

    if (!projectId || !credentialsJson) {
      return res.status(400).json({ 
        error: "Missing required fields: projectId, credentialsJson" 
      });
    }

    try {
      // Validate credentials JSON format
      JSON.parse(credentialsJson);
      
      // In production, you would use the Google Cloud Pub/Sub client
      // For now, we simulate a connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      res.json({ 
        success: true, 
        message: "Connection to Google Pub/Sub successful",
        projectId
      });
    } catch (error) {
      console.error("GCP Pub/Sub connection error:", error);
      res.status(500).json({ 
        error: "Failed to connect to Google Pub/Sub",
        message: error instanceof Error ? error.message : "Invalid credentials JSON"
      });
    }
  });

  // Register a topic
  app.post("/api/pubsub/topics", async (req, res) => {
    const { name, platform, kafkaConfig, gcpConfig } = req.body;

    if (!name || !platform) {
      return res.status(400).json({ error: "Topic name and platform are required" });
    }

    const topicId = `topic-${Date.now()}`;
    const topic = {
      id: topicId,
      name,
      platform,
      kafkaConfig,
      gcpConfig,
      createdAt: new Date().toISOString(),
    };

    pubsubTopics.set(topicId, topic);

    res.status(201).json(topic);
  });

  // Get all registered topics
  app.get("/api/pubsub/topics", async (req, res) => {
    const topics = Array.from(pubsubTopics.values());
    res.json(topics);
  });

  // Delete a topic
  app.delete("/api/pubsub/topics/:id", async (req, res) => {
    const { id } = req.params;
    
    if (!pubsubTopics.has(id)) {
      return res.status(404).json({ error: "Topic not found" });
    }

    pubsubTopics.delete(id);
    res.json({ success: true, message: "Topic deleted" });
  });

  // Send messages to Kafka topic
  app.post("/api/pubsub/kafka/send", async (req, res) => {
    const { topicId, messages, kafkaConfig } = req.body;

    if (!topicId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "topicId and messages array are required" });
    }

    try {
      // In production, you would use a Kafka producer to send messages
      // For now, we simulate sending messages with a delay
      const results = [];
      for (let i = 0; i < messages.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        results.push({
          messageId: `msg-${Date.now()}-${i}`,
          partition: Math.floor(Math.random() * 3),
          offset: 1000 + i,
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        messagesSent: messages.length,
        results,
      });
    } catch (error) {
      console.error("Error sending Kafka messages:", error);
      res.status(500).json({ 
        error: "Failed to send messages to Kafka",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Send messages to Google Pub/Sub topic
  app.post("/api/pubsub/gcp/send", async (req, res) => {
    const { topicId, messages, gcpConfig } = req.body;

    if (!topicId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "topicId and messages array are required" });
    }

    try {
      // In production, you would use the Google Cloud Pub/Sub publisher
      // For now, we simulate sending messages with a delay
      const results = [];
      for (let i = 0; i < messages.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        results.push({
          messageId: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          publishTime: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        messagesSent: messages.length,
        results,
      });
    } catch (error) {
      console.error("Error sending GCP Pub/Sub messages:", error);
      res.status(500).json({ 
        error: "Failed to send messages to Google Pub/Sub",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Generate K6 script for Pub/Sub load testing
  app.post("/api/pubsub/k6/generate-script", async (req, res) => {
    const { platform, topicName, config, producerApiUrl } = req.body;

    if (!platform || !topicName) {
      return res.status(400).json({ error: "Platform and topic name are required" });
    }

    const virtualUsers = config?.virtualUsers || 50;
    const duration = config?.duration || 5;
    const messagesPerSecond = config?.messagesPerSecond || 100;
    const rampUpTime = config?.rampUpTime || 30;

    const script = `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for Pub/Sub load testing
const publishErrors = new Rate('publish_errors');
const publishLatency = new Trend('publish_latency');
const messagesPublished = new Counter('messages_published');

export const options = {
  stages: [
    { duration: '${rampUpTime}s', target: ${virtualUsers} },
    { duration: '${duration}m', target: ${virtualUsers} },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'publish_errors': ['rate<0.01'],
    'publish_latency': ['p(95)<500'],
  },
};

const BASE_URL = __ENV.PRODUCER_API_URL || '${producerApiUrl || 'http://localhost:8080'}';
const TOPIC = '${topicName}';
const PLATFORM = '${platform}';

// Sample healthcare messages - customize for your use case
const sampleMessages = [
  { 
    patientId: 'P' + Math.random().toString(36).substring(7),
    eventType: 'vitals',
    timestamp: new Date().toISOString(),
    data: { heartRate: Math.floor(60 + Math.random() * 40), bloodPressure: '120/80', temperature: 98.6 }
  },
  {
    patientId: 'P' + Math.random().toString(36).substring(7),
    eventType: 'lab_result',
    timestamp: new Date().toISOString(),
    data: { testName: 'CBC', result: 'normal', units: 'mg/dL', value: Math.floor(Math.random() * 100) }
  },
  {
    patientId: 'P' + Math.random().toString(36).substring(7),
    eventType: 'medication',
    timestamp: new Date().toISOString(),
    data: { medication: 'Aspirin', dosage: '100mg', frequency: 'daily' }
  },
];

function generateMessage() {
  const template = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
  return {
    ...template,
    patientId: 'P' + Math.random().toString(36).substring(7),
    timestamp: new Date().toISOString(),
  };
}

export default function() {
  const message = generateMessage();
  
  const payload = JSON.stringify({
    topic: TOPIC,
    platform: PLATFORM,
    key: message.patientId,
    value: message,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const start = Date.now();
  const res = http.post(\`\${BASE_URL}/api/publish\`, payload, params);
  const latency = Date.now() - start;

  publishLatency.add(latency);
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has messageId': (r) => {
      try {
        return JSON.parse(r.body).messageId !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (success) {
    messagesPublished.add(1);
  }
  publishErrors.add(!success);

  // Rate limiting: target ${messagesPerSecond} messages/second per VU
  sleep(1 / ${Math.max(1, messagesPerSecond / virtualUsers)});
}

export function handleSummary(data) {
  const totalMessages = data.metrics.messages_published?.values?.count || 0;
  const errorRate = data.metrics.publish_errors?.values?.rate || 0;
  const avgLatency = data.metrics.publish_latency?.values?.avg || 0;
  const p95Latency = data.metrics.publish_latency?.values['p(95)'] || 0;
  
  console.log('\\n========== Pub/Sub Load Test Summary ==========');
  console.log(\`Platform: ${platform.toUpperCase()}\`);
  console.log(\`Topic: ${topicName}\`);
  console.log(\`Total Messages Published: \${totalMessages}\`);
  console.log(\`Error Rate: \${(errorRate * 100).toFixed(2)}%\`);
  console.log(\`Average Latency: \${avgLatency.toFixed(2)}ms\`);
  console.log(\`P95 Latency: \${p95Latency.toFixed(2)}ms\`);
  console.log('================================================\\n');
  
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'pubsub-summary.json': JSON.stringify(data),
  };
}
`;

    res.json({
      success: true,
      script,
      config: {
        platform,
        topicName,
        virtualUsers,
        duration,
        messagesPerSecond,
        rampUpTime,
      },
    });
  });

  // Trigger Pub/Sub load test (via GitHub Actions or local K6)
  app.post("/api/pubsub/trigger-loadtest", async (req, res) => {
    const { platform, topicName, config, token } = req.body;

    if (!platform || !topicName || !config) {
      return res.status(400).json({ error: "Platform, topic name, and config are required" });
    }

    try {
      // Generate a test ID
      const testId = `pubsub-${platform}-${Date.now()}`;

      // In production, this would trigger a GitHub Actions workflow or run K6 locally
      // For now, we return a simulated response
      res.json({
        success: true,
        message: "Load test triggered successfully",
        testId,
        config: {
          platform,
          topicName,
          virtualUsers: config.virtualUsers,
          duration: config.duration,
          messagesPerSecond: config.messagesPerSecond,
        },
      });
    } catch (error) {
      console.error("Error triggering load test:", error);
      res.status(500).json({ 
        error: "Failed to trigger load test",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
