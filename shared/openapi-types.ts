export interface OpenApiSchema {
  type?: string;
  format?: string;
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  required?: string[];
  enum?: string[];
  description?: string;
  example?: unknown;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  nullable?: boolean;
  $ref?: string;
}

export interface OpenApiRequestBody {
  description?: string;
  required?: boolean;
  content?: {
    'application/json'?: {
      schema?: OpenApiSchema;
      example?: unknown;
    };
  };
}

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required?: boolean;
  schema?: OpenApiSchema;
  description?: string;
  example?: unknown;
}

export interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  requestBody?: OpenApiRequestBody;
  parameters?: OpenApiParameter[];
  responses?: Record<string, unknown>;
}

export interface OpenApiPath {
  get?: OpenApiOperation;
  post?: OpenApiOperation;
  put?: OpenApiOperation;
  delete?: OpenApiOperation;
  patch?: OpenApiOperation;
  head?: OpenApiOperation;
  options?: OpenApiOperation;
}

export interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, OpenApiPath>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
  };
}

export interface ApiPayloadSchema {
  apiId: string;
  method: string;
  path: string;
  requestSchema?: OpenApiSchema;
  pathParameters?: OpenApiParameter[];
  queryParameters?: OpenApiParameter[];
  description?: string;
  example?: unknown;
}

export interface PayloadTemplate {
  apiId: string;
  apiPath: string;
  method: string;
  template: Record<string, unknown>;
  requiredFields: string[];
  fieldDescriptions: Record<string, string>;
}

export interface ValidationError {
  field: string;
  message: string;
  row?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  validCount: number;
  invalidCount: number;
}
