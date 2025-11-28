import { useState, useRef } from 'react';
import { Link } from 'wouter';
import { 
  ArrowLeft, 
  Upload, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  FileJson,
  User,
  Layers,
  CheckCircle,
  AlertCircle,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAdminApps, AdminAppWithApis, AdminApp } from '@/contexts/AdminAppsContext';
import { OpenApiSpec, OpenApiPath } from '@shared/openapi-types';
import { ApiEndpoint } from '@shared/mock-data';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const appColors = ['blue', 'green', 'purple', 'orange', 'teal', 'pink', 'indigo', 'red'];
const appIcons = ['FileJson', 'Activity', 'FileHeart', 'Users', 'Stethoscope', 'CreditCard', 'Pill', 'Layers'];

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

function parseOpenApiSpec(spec: OpenApiSpec): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  let idCounter = 1;

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    const methods: Array<{ method: HttpMethod; operation: any }> = [];
    
    if (pathItem.get) methods.push({ method: 'GET', operation: pathItem.get });
    if (pathItem.post) methods.push({ method: 'POST', operation: pathItem.post });
    if (pathItem.put) methods.push({ method: 'PUT', operation: pathItem.put });
    if (pathItem.delete) methods.push({ method: 'DELETE', operation: pathItem.delete });
    if (pathItem.patch) methods.push({ method: 'PATCH', operation: pathItem.patch });
    if (pathItem.head) methods.push({ method: 'HEAD', operation: pathItem.head });
    if (pathItem.options) methods.push({ method: 'OPTIONS', operation: pathItem.options });

    for (const { method, operation } of methods) {
      const category = extractCategory(path, operation);
      endpoints.push({
        id: `admin-ep-${idCounter++}`,
        method,
        path,
        category,
        description: operation.summary || operation.description || `${method} ${path}`,
        estimatedResponseTime: '~200ms',
      });
    }
  }

  if (endpoints.length === 0) {
    console.warn('No API endpoints found in the uploaded OpenAPI specification');
  }

  return endpoints;
}

function extractCategory(path: string, operation: any): string {
  if (operation.tags && operation.tags.length > 0) {
    return operation.tags[0];
  }
  
  const segments = path.split('/').filter(Boolean);
  for (const segment of segments) {
    if (!segment.startsWith('{') && segment !== 'api' && segment !== 'v1' && segment !== 'v2') {
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
  }
  
  return 'General';
}

function generateAppId(name: string): string {
  return 'admin-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function Admin() {
  const { toast } = useToast();
  const { adminApps, addAdminApp, removeAdminApp } = useAdminApps();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [appName, setAppName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [uploadedSpec, setUploadedSpec] = useState<OpenApiSpec | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [parsedApis, setParsedApis] = useState<ApiEndpoint[]>([]);
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JSON file containing an OpenAPI specification.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const spec = JSON.parse(content) as OpenApiSpec;
        
        if (!spec.openapi || !spec.paths) {
          throw new Error('Invalid OpenAPI specification');
        }

        const apis = parseOpenApiSpec(spec);
        
        if (apis.length === 0) {
          toast({
            title: 'No API endpoints found',
            description: 'The uploaded specification does not contain any API endpoints with supported HTTP methods (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS). Please check your OpenAPI spec.',
            variant: 'destructive',
          });
          return;
        }

        setUploadedSpec(spec);
        setUploadedFileName(file.name);
        setParsedApis(apis);
        
        if (!appName && spec.info?.title) {
          setAppName(spec.info.title);
        }

        toast({
          title: 'OpenAPI spec uploaded',
          description: `Found ${apis.length} API endpoint${apis.length !== 1 ? 's' : ''} in the specification.`,
        });
      } catch (error) {
        toast({
          title: 'Failed to parse OpenAPI spec',
          description: 'The uploaded file is not a valid OpenAPI JSON specification.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleAddApplication = () => {
    if (!appName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter an application name.',
        variant: 'destructive',
      });
      return;
    }

    if (!ownerName.trim()) {
      toast({
        title: 'Owner required',
        description: 'Please enter the owner name.',
        variant: 'destructive',
      });
      return;
    }

    if (!uploadedSpec) {
      toast({
        title: 'OpenAPI spec required',
        description: 'Please upload an OpenAPI specification file.',
        variant: 'destructive',
      });
      return;
    }

    if (parsedApis.length === 0) {
      toast({
        title: 'No API endpoints',
        description: 'The uploaded specification does not contain any API endpoints. Please upload a valid OpenAPI spec with defined operations.',
        variant: 'destructive',
      });
      return;
    }

    const appId = generateAppId(appName);
    const colorIndex = adminApps.length % appColors.length;
    const iconIndex = adminApps.length % appIcons.length;

    const adminApp: AdminApp = {
      id: appId,
      name: appName.trim(),
      description: uploadedSpec.info?.description || `Custom application: ${appName}`,
      icon: appIcons[iconIndex],
      color: appColors[colorIndex],
      apiCount: parsedApis.length,
      isFavorite: false,
      owner: ownerName.trim(),
      openApiSpec: uploadedSpec,
      isAdminConfigured: true,
    };

    const appWithApis: AdminAppWithApis = {
      app: adminApp,
      apis: parsedApis.map((api, idx) => ({
        ...api,
        id: `${appId}-ep-${idx + 1}`,
      })),
    };

    addAdminApp(appWithApis);

    toast({
      title: 'Application added',
      description: `${appName} has been added with ${parsedApis.length} API endpoints.`,
    });

    resetForm();
    setShowAddDialog(false);
  };

  const resetForm = () => {
    setAppName('');
    setOwnerName('');
    setUploadedSpec(null);
    setUploadedFileName('');
    setParsedApis([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteApp = (appId: string, appName: string) => {
    removeAdminApp(appId);
    toast({
      title: 'Application removed',
      description: `${appName} has been removed from the configuration.`,
    });
  };

  const toggleExpanded = (appId: string) => {
    setExpandedApps((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'POST': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'PUT': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'DELETE': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" data-testid="button-back-dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-semibold">Admin Panel</h1>
              </div>
            </div>
            <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-application">
              <Plus className="h-4 w-4 mr-2" />
              Add Application
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Configured Applications
            </CardTitle>
            <CardDescription>
              Applications configured via OpenAPI specifications. These will appear in the load test wizard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {adminApps.length === 0 ? (
              <div className="text-center py-12">
                <FileJson className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No applications configured</h3>
                <p className="text-muted-foreground mb-4">
                  Upload an OpenAPI specification to add a new application for load testing.
                </p>
                <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-first-app">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Application
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {adminApps.map(({ app, apis }) => (
                  <Collapsible
                    key={app.id}
                    open={expandedApps.has(app.id)}
                    onOpenChange={() => toggleExpanded(app.id)}
                  >
                    <Card className="border">
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              className="flex items-center gap-3 p-0 h-auto hover:bg-transparent"
                              data-testid={`button-expand-${app.id}`}
                            >
                              {expandedApps.has(app.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <div className="text-left">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium" data-testid={`text-app-name-${app.id}`}>{app.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {apis.length} API{apis.length !== 1 ? 's' : ''}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    Admin Configured
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  <User className="h-3 w-3" />
                                  <span data-testid={`text-app-owner-${app.id}`}>{app.owner}</span>
                                </div>
                              </div>
                            </Button>
                          </CollapsibleTrigger>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteApp(app.id, app.name)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            data-testid={`button-delete-${app.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CollapsibleContent>
                        <div className="border-t px-4 py-3 bg-muted/30">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-24">Method</TableHead>
                                <TableHead>Path</TableHead>
                                <TableHead className="w-32">Category</TableHead>
                                <TableHead>Description</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {apis.map((api) => (
                                <TableRow key={api.id} data-testid={`row-api-${api.id}`}>
                                  <TableCell>
                                    <Badge className={`${getMethodColor(api.method)} font-mono text-xs`}>
                                      {api.method}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">{api.path}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">{api.category}</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {api.description}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Application
            </DialogTitle>
            <DialogDescription>
              Configure a new application by uploading its OpenAPI specification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appName">Application Name</Label>
                <Input
                  id="appName"
                  placeholder="e.g., Patient Management API"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  data-testid="input-app-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner</Label>
                <Input
                  id="ownerName"
                  placeholder="e.g., Healthcare Team"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  data-testid="input-owner-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>OpenAPI Specification</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  uploadedSpec
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="openapi-upload"
                  data-testid="input-openapi-file"
                />
                {uploadedSpec ? (
                  <div className="space-y-2">
                    <CheckCircle className="h-10 w-10 mx-auto text-primary" />
                    <p className="font-medium">{uploadedFileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadedSpec.info?.title} v{uploadedSpec.info?.version}
                    </p>
                    <p className="text-sm text-primary font-medium">
                      {parsedApis.length} API endpoint{parsedApis.length !== 1 ? 's' : ''} detected
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-change-file"
                    >
                      Change File
                    </Button>
                  </div>
                ) : (
                  <label htmlFor="openapi-upload" className="cursor-pointer">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="font-medium">Upload OpenAPI Specification</p>
                    <p className="text-sm text-muted-foreground">
                      JSON format (OpenAPI 3.x)
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-upload-spec"
                    >
                      Choose File
                    </Button>
                  </label>
                )}
              </div>
            </div>

            {parsedApis.length > 0 && (
              <div className="space-y-2">
                <Label>Detected API Endpoints ({parsedApis.length})</Label>
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Method</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead className="w-28">Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedApis.slice(0, 10).map((api, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge className={`${getMethodColor(api.method)} font-mono text-xs`}>
                              {api.method}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{api.path}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{api.category}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {parsedApis.length > 10 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                            +{parsedApis.length - 10} more endpoints
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowAddDialog(false); }} data-testid="button-cancel-add">
              Cancel
            </Button>
            <Button onClick={handleAddApplication} data-testid="button-confirm-add">
              <Plus className="h-4 w-4 mr-2" />
              Add Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
