import { useState, useRef } from 'react';
import { Upload, FileJson, Check, AlertCircle, Trash2, Eye, Download, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ApiEndpoint } from '@shared/mock-data';
import { generatePayloadTemplate, validatePayload, generateTemplateJson } from '@shared/template-generator';
import type { ValidationResult, PayloadTemplate, OpenApiSpec } from '@shared/openapi-types';

export interface PayloadFile {
  apiId: string;
  fileName: string;
  data: unknown[];
  recordCount: number;
  validationResult?: ValidationResult;
}

interface PayloadUploadStepProps {
  selectedApis: ApiEndpoint[];
  payloads: PayloadFile[];
  onPayloadsChange: (payloads: PayloadFile[]) => void;
  appId: string;
  customSpec?: OpenApiSpec;
}

export function PayloadUploadStep({
  selectedApis,
  payloads,
  onPayloadsChange,
  appId,
  customSpec,
}: PayloadUploadStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [templateDialogApi, setTemplateDialogApi] = useState<ApiEndpoint | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getPayloadForApi = (apiId: string) => {
    return payloads.find((p) => p.apiId === apiId);
  };

  const getTemplateForApi = (api: ApiEndpoint): PayloadTemplate | null => {
    return generatePayloadTemplate(appId, api.path, api.method, customSpec);
  };

  const handleDownloadTemplate = (api: ApiEndpoint) => {
    const template = getTemplateForApi(api);
    if (!template) {
      return;
    }

    const jsonContent = generateTemplateJson(template);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${api.method.toLowerCase()}-${api.path.replace(/\//g, '_').replace(/[{}]/g, '')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (api: ApiEndpoint, file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        const dataArray = Array.isArray(parsed) ? parsed : [parsed];

        if (dataArray.length === 0) {
          setErrors((prev) => ({
            ...prev,
            [api.id]: 'File contains no data',
          }));
          return;
        }

        const validationResult = validatePayload(appId, api.path, api.method, dataArray, customSpec);

        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[api.id];
          return newErrors;
        });

        const newPayload: PayloadFile = {
          apiId: api.id,
          fileName: file.name,
          data: dataArray,
          recordCount: dataArray.length,
          validationResult,
        };

        const existingIndex = payloads.findIndex((p) => p.apiId === api.id);
        if (existingIndex >= 0) {
          const updated = [...payloads];
          updated[existingIndex] = newPayload;
          onPayloadsChange(updated);
        } else {
          onPayloadsChange([...payloads, newPayload]);
        }
      } catch (err) {
        setErrors((prev) => ({
          ...prev,
          [api.id]: 'Invalid JSON file. Please upload a valid JSON array.',
        }));
      }
    };

    reader.onerror = () => {
      setErrors((prev) => ({
        ...prev,
        [api.id]: 'Failed to read file',
      }));
    };

    reader.readAsText(file);
  };

  const handleRemovePayload = (apiId: string) => {
    onPayloadsChange(payloads.filter((p) => p.apiId !== apiId));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[apiId];
      return newErrors;
    });
  };

  const getMethodBadgeVariant = (method: string) => {
    switch (method) {
      case 'GET':
        return 'default';
      case 'POST':
        return 'secondary';
      case 'PUT':
        return 'outline';
      case 'DELETE':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="mb-2 text-3xl font-bold" data-testid="text-payload-title">
          Upload Payload Data
        </h2>
        <p className="text-muted-foreground">
          Upload JSON files containing test data for each API endpoint
        </p>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <FileJson className="mt-0.5 h-5 w-5 text-primary" />
          <div className="text-sm">
            <p className="font-medium">OpenAPI-Driven Templates</p>
            <p className="text-muted-foreground">
              Click "Generate Template" to download a JSON template based on the API specification.
              Fill in the template with your test data and upload it back.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {selectedApis.map((api) => {
          const payload = getPayloadForApi(api.id);
          const error = errors[api.id];
          const template = getTemplateForApi(api);
          const hasTemplate = template !== null;

          return (
            <Card key={api.id} data-testid={`card-api-payload-${api.id}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Badge variant={getMethodBadgeVariant(api.method)}>
                      {api.method}
                    </Badge>
                    <span className="font-mono text-sm">{api.path}</span>
                  </div>
                  <Badge variant="outline">{api.category}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  {api.description}
                </p>

                {!payload ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {hasTemplate && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                className="gap-2"
                                onClick={() => handleDownloadTemplate(api)}
                                data-testid={`button-download-template-${api.id}`}
                              >
                                <Download className="h-4 w-4" />
                                Generate Template
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Download a JSON template based on the API specification
                            </TooltipContent>
                          </Tooltip>
                          
                          <Dialog open={templateDialogApi?.id === api.id} onOpenChange={(open) => setTemplateDialogApi(open ? api : null)}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-view-schema-${api.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Schema Details - {api.method} {api.path}</DialogTitle>
                              </DialogHeader>
                              <ScrollArea className="max-h-[60vh]">
                                {template && (
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="mb-2 font-semibold">Required Fields</h4>
                                      {template.requiredFields.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                          {template.requiredFields.map((field) => (
                                            <Badge key={field} variant="destructive">
                                              {field}
                                            </Badge>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">No required fields</p>
                                      )}
                                    </div>
                                    
                                    <div>
                                      <h4 className="mb-2 font-semibold">Field Descriptions</h4>
                                      <div className="space-y-2">
                                        {Object.entries(template.fieldDescriptions).map(([field, desc]) => (
                                          <div key={field} className="rounded-lg bg-muted p-2">
                                            <span className="font-mono text-sm font-medium">{field}</span>
                                            <p className="text-sm text-muted-foreground">{desc || 'No description'}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <h4 className="mb-2 font-semibold">Sample Template</h4>
                                      <pre className="rounded-lg bg-muted p-4 text-xs overflow-x-auto">
                                        {generateTemplateJson(template)}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                    </div>
                    
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      ref={(el) => (fileInputRefs.current[api.id] = el)}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(api, file);
                        }
                      }}
                      data-testid={`input-file-${api.id}`}
                    />
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-dashed py-8"
                      onClick={() => fileInputRefs.current[api.id]?.click()}
                      data-testid={`button-upload-${api.id}`}
                    >
                      <Upload className="h-5 w-5" />
                      Upload JSON Payload File
                    </Button>
                    {error && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Check className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium" data-testid={`text-filename-${api.id}`}>
                            {payload.fileName}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-records-${api.id}`}>
                            {payload.recordCount.toLocaleString()} records loaded
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-preview-${api.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Payload Preview - {api.path}</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="max-h-96">
                              <pre className="rounded-lg bg-muted p-4 text-xs">
                                {JSON.stringify(payload.data.slice(0, 5), null, 2)}
                              </pre>
                              {payload.recordCount > 5 && (
                                <p className="mt-2 text-center text-sm text-muted-foreground">
                                  ... and {payload.recordCount - 5} more records
                                </p>
                              )}
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePayload(api.id)}
                          data-testid={`button-remove-${api.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {payload.validationResult && (
                      <div className={`rounded-lg p-3 ${
                        payload.validationResult.isValid 
                          ? 'bg-green-500/10 border border-green-500/20' 
                          : 'bg-yellow-500/10 border border-yellow-500/20'
                      }`}>
                        <div className="flex items-center gap-2">
                          {payload.validationResult.isValid ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                All {payload.validationResult.validCount} records are valid
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                                {payload.validationResult.validCount} valid, {payload.validationResult.invalidCount} with issues
                              </span>
                            </>
                          )}
                        </div>
                        
                        {!payload.validationResult.isValid && payload.validationResult.errors.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {payload.validationResult.errors.slice(0, 5).map((err, idx) => (
                              <p key={idx} className="text-xs text-yellow-700 dark:text-yellow-400">
                                Row {err.row}: {err.message}
                              </p>
                            ))}
                            {payload.validationResult.errors.length > 5 && (
                              <p className="text-xs text-muted-foreground">
                                ... and {payload.validationResult.errors.length - 5} more issues
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="font-medium">Upload Progress</p>
            <p className="text-sm text-muted-foreground">
              {payloads.length} of {selectedApis.length} APIs configured
            </p>
          </div>
          <div className="flex items-center gap-2">
            {payloads.length === selectedApis.length ? (
              <Badge variant="default" className="gap-1">
                <Check className="h-3 w-3" />
                All APIs Ready
              </Badge>
            ) : (
              <Badge variant="secondary">
                {selectedApis.length - payloads.length} remaining
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
