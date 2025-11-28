import type { 
  OpenApiSchema, 
  OpenApiSpec, 
  PayloadTemplate, 
  ValidationResult, 
  ValidationError 
} from './openapi-types';
import { openApiSpecs, getApiPathKey } from './openapi-specs';

function generateValueFromSchema(schema: OpenApiSchema, fieldName: string): unknown {
  if (schema.example !== undefined) {
    return schema.example;
  }
  
  if (schema.default !== undefined) {
    return schema.default;
  }
  
  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[0];
  }
  
  switch (schema.type) {
    case 'string':
      if (schema.format === 'date') {
        return '2024-01-15';
      }
      if (schema.format === 'date-time') {
        return '2024-01-15T10:00:00Z';
      }
      if (schema.format === 'email') {
        return 'example@email.com';
      }
      return `${fieldName}_value`;
    
    case 'integer':
    case 'number':
      return schema.minimum ?? 1;
    
    case 'boolean':
      return true;
    
    case 'array':
      if (schema.items) {
        return [generateValueFromSchema(schema.items, fieldName)];
      }
      return [];
    
    case 'object':
      if (schema.properties) {
        const obj: Record<string, unknown> = {};
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          obj[key] = generateValueFromSchema(propSchema, key);
        }
        return obj;
      }
      return {};
    
    default:
      return null;
  }
}

function getFieldDescriptions(schema: OpenApiSchema): Record<string, string> {
  const descriptions: Record<string, string> = {};
  
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      let desc = propSchema.description || '';
      
      if (propSchema.enum) {
        desc += ` (Values: ${propSchema.enum.join(', ')})`;
      }
      if (propSchema.format) {
        desc += ` [Format: ${propSchema.format}]`;
      }
      if (schema.required?.includes(key)) {
        desc = `(Required) ${desc}`;
      }
      
      descriptions[key] = desc.trim();
    }
  }
  
  return descriptions;
}

export function generatePayloadTemplate(
  appId: string,
  apiPath: string,
  method: string,
  customSpec?: OpenApiSpec
): PayloadTemplate | null {
  const spec = customSpec || openApiSpecs[appId];
  if (!spec) {
    return null;
  }
  
  const pathKey = getApiPathKey(apiPath);
  const methodLower = method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
  
  let pathSpec = spec.paths[pathKey];
  if (!pathSpec) {
    pathSpec = spec.paths[apiPath];
  }
  if (!pathSpec) {
    for (const [specPath, specValue] of Object.entries(spec.paths)) {
      if (getApiPathKey(specPath) === pathKey || specPath === apiPath) {
        pathSpec = specValue;
        break;
      }
    }
  }
  
  if (!pathSpec) {
    return null;
  }
  
  const operation = pathSpec[methodLower];
  if (!operation) {
    return null;
  }
  
  const requestBody = operation.requestBody;
  if (!requestBody?.content?.['application/json']?.schema) {
    if (operation.parameters && operation.parameters.length > 0) {
      const template: Record<string, unknown> = {};
      const requiredFields: string[] = [];
      const fieldDescriptions: Record<string, string> = {};
      
      for (const param of operation.parameters) {
        if (param.in === 'path' || param.in === 'query') {
          template[param.name] = param.example || 
            generateValueFromSchema(param.schema || { type: 'string' }, param.name);
          
          if (param.required) {
            requiredFields.push(param.name);
          }
          
          fieldDescriptions[param.name] = param.description || '';
        }
      }
      
      if (Object.keys(template).length > 0) {
        return {
          apiId: `${appId}-${methodLower}-${pathKey}`,
          apiPath,
          method,
          template,
          requiredFields,
          fieldDescriptions,
        };
      }
    }
    
    return null;
  }
  
  const schema = requestBody.content['application/json'].schema;
  const template: Record<string, unknown> = {};
  const requiredFields = schema.required || [];
  
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      template[key] = generateValueFromSchema(propSchema, key);
    }
  }
  
  return {
    apiId: `${appId}-${methodLower}-${pathKey}`,
    apiPath,
    method,
    template,
    requiredFields,
    fieldDescriptions: getFieldDescriptions(schema),
  };
}

export function validatePayload(
  appId: string,
  apiPath: string,
  method: string,
  payload: unknown[],
  customSpec?: OpenApiSpec
): ValidationResult {
  const errors: ValidationError[] = [];
  let validCount = 0;
  let invalidCount = 0;
  
  const spec = customSpec || openApiSpecs[appId];
  if (!spec) {
    return {
      isValid: true,
      errors: [],
      validCount: payload.length,
      invalidCount: 0,
    };
  }
  
  const pathKey = getApiPathKey(apiPath);
  const methodLower = method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
  
  let pathSpec = spec.paths[pathKey];
  if (!pathSpec) {
    pathSpec = spec.paths[apiPath];
  }
  if (!pathSpec) {
    for (const [specPath, specValue] of Object.entries(spec.paths)) {
      if (getApiPathKey(specPath) === pathKey || specPath === apiPath) {
        pathSpec = specValue;
        break;
      }
    }
  }
  
  if (!pathSpec) {
    return {
      isValid: true,
      errors: [],
      validCount: payload.length,
      invalidCount: 0,
    };
  }
  
  const operation = pathSpec[methodLower];
  if (!operation?.requestBody?.content?.['application/json']?.schema) {
    return {
      isValid: true,
      errors: [],
      validCount: payload.length,
      invalidCount: 0,
    };
  }
  
  const schema = operation.requestBody.content['application/json'].schema;
  const requiredFields = schema.required || [];
  
  payload.forEach((record, index) => {
    if (typeof record !== 'object' || record === null) {
      errors.push({
        field: 'root',
        message: 'Record must be an object',
        row: index + 1,
      });
      invalidCount++;
      return;
    }
    
    const recordObj = record as Record<string, unknown>;
    let recordValid = true;
    
    for (const field of requiredFields) {
      if (!(field in recordObj) || recordObj[field] === undefined || recordObj[field] === null || recordObj[field] === '') {
        errors.push({
          field,
          message: `Missing required field: ${field}`,
          row: index + 1,
        });
        recordValid = false;
      }
    }
    
    if (schema.properties) {
      for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
        const value = recordObj[fieldName];
        
        if (value === undefined || value === null) {
          continue;
        }
        
        const fieldError = validateFieldType(value, fieldSchema, fieldName, index + 1);
        if (fieldError) {
          errors.push(fieldError);
          recordValid = false;
        }
      }
    }
    
    if (recordValid) {
      validCount++;
    } else {
      invalidCount++;
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors: errors.slice(0, 50),
    validCount,
    invalidCount,
  };
}

function validateFieldType(
  value: unknown,
  schema: OpenApiSchema,
  fieldName: string,
  row: number
): ValidationError | null {
  if (schema.enum && !schema.enum.includes(value as string)) {
    return {
      field: fieldName,
      message: `Invalid value for ${fieldName}. Expected one of: ${schema.enum.join(', ')}`,
      row,
    };
  }
  
  switch (schema.type) {
    case 'string':
      if (typeof value !== 'string') {
        return {
          field: fieldName,
          message: `${fieldName} must be a string`,
          row,
        };
      }
      
      if (schema.format === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return {
          field: fieldName,
          message: `${fieldName} must be a valid date (YYYY-MM-DD)`,
          row,
        };
      }
      
      if (schema.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return {
          field: fieldName,
          message: `${fieldName} must be a valid email address`,
          row,
        };
      }
      break;
    
    case 'integer':
      if (!Number.isInteger(value)) {
        return {
          field: fieldName,
          message: `${fieldName} must be an integer`,
          row,
        };
      }
      break;
    
    case 'number':
      if (typeof value !== 'number') {
        return {
          field: fieldName,
          message: `${fieldName} must be a number`,
          row,
        };
      }
      break;
    
    case 'boolean':
      if (typeof value !== 'boolean') {
        return {
          field: fieldName,
          message: `${fieldName} must be a boolean`,
          row,
        };
      }
      break;
    
    case 'array':
      if (!Array.isArray(value)) {
        return {
          field: fieldName,
          message: `${fieldName} must be an array`,
          row,
        };
      }
      break;
    
    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return {
          field: fieldName,
          message: `${fieldName} must be an object`,
          row,
        };
      }
      break;
  }
  
  return null;
}

export function generateTemplateJson(template: PayloadTemplate): string {
  const records = [template.template];
  return JSON.stringify(records, null, 2);
}

export function generateTemplateWithComments(template: PayloadTemplate): string {
  const lines: string[] = ['['];
  lines.push('  {');
  
  const entries = Object.entries(template.template);
  entries.forEach(([key, value], index) => {
    const isLast = index === entries.length - 1;
    const valueStr = JSON.stringify(value);
    const description = template.fieldDescriptions[key] || '';
    const isRequired = template.requiredFields.includes(key);
    
    let line = `    "${key}": ${valueStr}${isLast ? '' : ','}`;
    
    lines.push(line);
  });
  
  lines.push('  }');
  lines.push(']');
  
  return lines.join('\n');
}

export function hasSchemaForApi(appId: string, apiPath: string, method: string): boolean {
  const template = generatePayloadTemplate(appId, apiPath, method);
  return template !== null;
}
