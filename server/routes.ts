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
    rampUpTime: 5,
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

  // GitHub Actions Integration for CAEL
  app.post("/api/github/trigger-workflow", async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "GitHub token is required" });
    }

    try {
      // Hardcoded parameters from the screenshot
      const workflowParams = {
        ref: "master",
        inputs: {
          stage2_duration: "5m",
          stage2_target: "100",
          parallelism: "2",
          test_id: `cael-test-${Date.now()}`,
          test_url: "https://cdr-de-clinical-api.prod.aig.aetna.com/persons/033944599299665$/visits"
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

      // Get recent workflow runs to find the one we just triggered
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
      });
    } catch (error) {
      console.error("Error triggering workflow:", error);
      res.status(500).json({ 
        error: "Failed to trigger workflow", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
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
