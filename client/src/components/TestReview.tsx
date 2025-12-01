import { ChevronDown, ChevronUp, Copy, Rocket, FileJson, Check, AlertCircle, Download, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PayloadFile {
  apiId: string;
  fileName: string;
  data: any[];
  recordCount: number;
}

interface TestReviewProps {
  application: {
    id: string;
    name: string;
    icon: string;
    color: string;
    isRealIntegration?: boolean;
  };
  selectedApis: Array<{
    id: string;
    method: string;
    path: string;
    description?: string;
    category?: string;
  }>;
  config: {
    virtualUsers: number;
    rampUpTime: number;
    duration: number;
    thinkTime: number;
    responseTimeThreshold?: number;
    errorRateThreshold?: number;
  };
  payloads?: PayloadFile[];
  onTrigger: () => void;
  onBack: () => void;
}

const colorClasses: Record<string, string> = {
  blue: 'bg-gradient-to-r from-app-blue to-app-indigo',
  green: 'bg-gradient-to-r from-app-green to-app-teal',
  purple: 'bg-gradient-to-r from-app-purple to-app-pink',
  orange: 'bg-gradient-to-r from-app-orange to-app-yellow',
  yellow: 'bg-gradient-to-r from-app-yellow to-app-orange',
  pink: 'bg-gradient-to-r from-app-pink to-app-purple',
  teal: 'bg-gradient-to-r from-app-teal to-app-green',
  indigo: 'bg-gradient-to-r from-app-indigo to-app-blue',
};

export function TestReview({ application, selectedApis, config, payloads = [], onTrigger, onBack }: TestReviewProps) {
  const { toast } = useToast();
  const [apisExpanded, setApisExpanded] = useState(false);
  const [payloadsExpanded, setPayloadsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const Icon = (LucideIcons as any)[application.icon] || LucideIcons.Box;
  
  const getPayloadForApi = (apiId: string) => payloads.find(p => p.apiId === apiId);
  
  const handleDownloadK6Script = async () => {
    setIsDownloading(true);
    try {
      const payloadsMap: Record<string, any[]> = {};
      payloads.forEach((p) => {
        payloadsMap[p.apiId] = p.data;
      });

      const response = await fetch('/api/k6/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPlan: {
            selectedApis,
            payloads: payloadsMap,
            config,
            baseUrl: 'https://cdr-de-clinical-api.prod.aig.aetna.com',
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to generate script');

      const data = await response.json();
      
      // Create and download the file
      const blob = new Blob([data.script], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `k6-test-${data.testId}.js`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'K6 script downloaded',
        description: 'Run with: k6 run k6-test.js',
      });
    } catch (error) {
      toast({
        title: 'Failed to download script',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const payloadPreview = JSON.stringify(
    {
      application: {
        id: application.id,
        name: application.name,
      },
      endpoints: selectedApis.map((api) => ({
        method: api.method,
        path: api.path,
      })),
      configuration: {
        scenarios: {
          main: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
              {
                duration: `${config.rampUpTime}s`,
                target: config.virtualUsers,
              },
              {
                duration: `${config.duration}m`,
                target: config.virtualUsers,
              },
            ],
          },
        },
        thresholds: {
          ...(config.responseTimeThreshold && {
            http_req_duration: [`p(95)<${config.responseTimeThreshold}`],
          }),
          ...(config.errorRateThreshold && {
            http_req_failed: [`rate<${config.errorRateThreshold / 100}`],
          }),
        },
      },
    },
    null,
    2
  );

  return (
    <div className="space-y-6" data-testid="test-review">
      <Card className="overflow-hidden">
        <div className={`p-6 ${colorClasses[application.color]} text-white`}>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <Icon className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm opacity-90">Selected Application</p>
              <h2 className="text-2xl font-semibold" data-testid="text-selected-app">{application.name}</h2>
            </div>
          </div>
        </div>

        <div className="border-t p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Selected APIs</h3>
                <Badge variant="secondary" data-testid="badge-selected-count">{selectedApis.length} APIs</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setApisExpanded(!apisExpanded)}
                data-testid="button-toggle-apis"
              >
                {apisExpanded ? (
                  <>
                    Hide <ChevronUp className="ml-1 h-4 w-4" />
                  </>
                ) : (
                  <>
                    View All <ChevronDown className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>

            {apisExpanded && (
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-4">
                {selectedApis.map((api) => (
                  <div key={api.id} className="flex items-center gap-2 text-sm" data-testid={`api-item-${api.id}`}>
                    <Badge variant="outline" className="text-xs">
                      {api.method}
                    </Badge>
                    <code className="font-mono">{api.path}</code>
                  </div>
                ))}
              </div>
            )}
          </div>

          {payloads.length > 0 && (
            <div className="mt-6 space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileJson className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Payload Data</h3>
                  <Badge variant="secondary" data-testid="badge-payload-count">
                    {payloads.length} files uploaded
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPayloadsExpanded(!payloadsExpanded)}
                  data-testid="button-toggle-payloads"
                >
                  {payloadsExpanded ? (
                    <>
                      Hide <ChevronUp className="ml-1 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      View Details <ChevronDown className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              <div className="grid gap-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Records</span>
                  <span className="font-medium text-foreground" data-testid="text-total-records">
                    {payloads.reduce((sum, p) => sum + p.recordCount, 0).toLocaleString()} records
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>APIs Configured</span>
                  <span className="font-medium text-foreground">
                    {payloads.length} of {selectedApis.length}
                  </span>
                </div>
              </div>

              {payloadsExpanded && (
                <div className="space-y-2 rounded-lg border p-4">
                  {selectedApis.map((api) => {
                    const payload = getPayloadForApi(api.id);
                    return (
                      <div
                        key={api.id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                        data-testid={`payload-item-${api.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            {api.method}
                          </Badge>
                          <code className="text-sm font-mono">{api.path}</code>
                        </div>
                        {payload ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            <span className="text-muted-foreground">{payload.fileName}</span>
                            <Badge variant="secondary" className="text-xs">
                              {payload.recordCount.toLocaleString()} records
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <AlertCircle className="h-4 w-4" />
                            <span>No payload uploaded</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 font-semibold">Performance Parameters</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Virtual Users</p>
            <p className="mt-1 text-3xl font-semibold text-primary" data-testid="text-review-vus">{config.virtualUsers}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Ramp-up Time</p>
            <p className="mt-1 text-3xl font-semibold text-chart-4" data-testid="text-review-rampup">{config.rampUpTime}s</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Test Duration</p>
            <p className="mt-1 text-3xl font-semibold text-app-orange" data-testid="text-review-duration">{config.duration}m</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Think Time</p>
            <p className="mt-1 text-3xl font-semibold text-app-pink" data-testid="text-review-thinktime">{config.thinkTime}s</p>
          </div>
        </div>

        {(config.responseTimeThreshold || config.errorRateThreshold) && (
          <div className="mt-4 space-y-2 rounded-lg border p-4">
            <h4 className="text-sm font-semibold">Advanced Settings</h4>
            <div className="grid gap-2 text-sm">
              {config.responseTimeThreshold && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Response Time Threshold</span>
                  <span>&lt; {config.responseTimeThreshold}ms (95th percentile)</span>
                </div>
              )}
              {config.errorRateThreshold && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Error Rate Threshold</span>
                  <span>&lt; {config.errorRateThreshold}%</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Payload Preview</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(payloadPreview);
              console.log('Copied to clipboard');
            }}
            data-testid="button-copy-payload"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
          <code data-testid="text-payload-preview">{payloadPreview}</code>
        </pre>
      </Card>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-chart-2/5 p-6">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-primary/10 p-4">
            {application.isRealIntegration ? (
              <GitBranch className="h-8 w-8 text-primary" />
            ) : (
              <Rocket className="h-8 w-8 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Ready to Launch</h3>
            <p className="text-sm text-muted-foreground">
              {application.isRealIntegration 
                ? 'Your test will run via GitHub Actions with real K6 execution'
                : 'Your load test configuration is complete and ready to execute'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <Button 
              variant="outline" 
              onClick={handleDownloadK6Script}
              disabled={isDownloading}
              data-testid="button-download-k6"
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? 'Generating...' : 'Download K6 Script'}
            </Button>
            <Button variant="outline" onClick={onBack} data-testid="button-back">
              Back
            </Button>
            <Button onClick={onTrigger} size="lg" className="gap-2" data-testid="button-trigger-test">
              {application.isRealIntegration ? (
                <>
                  <GitBranch className="h-5 w-5" />
                  Run via GitHub Actions
                </>
              ) : (
                <>
                  <Rocket className="h-5 w-5" />
                  Trigger Load Test
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
