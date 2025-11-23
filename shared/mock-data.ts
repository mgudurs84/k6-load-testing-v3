export interface HealthcareApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  apiCount: number;
  isFavorite: boolean;
  isRealIntegration?: boolean;
}

export interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  category: string;
  description: string;
  estimatedResponseTime: string;
}

export interface TestConfig {
  virtualUsers: number;
  rampUpTime: number;
  duration: number;
  thinkTime: number;
  responseTimeThreshold?: number;
  errorRateThreshold?: number;
}

export const healthcareApps: HealthcareApp[] = [
  {
    id: 'cdr-clinical',
    name: 'CDR Clinical API',
    description: 'Healthcare data exchange platform for clinical information sharing and management',
    icon: 'Activity',
    color: 'blue',
    apiCount: 24,
    isFavorite: true,
  },
  {
    id: 'clinical-data',
    name: 'Clinical Data API',
    description: 'Comprehensive clinical data management system for healthcare providers and organizations',
    icon: 'FileHeart',
    color: 'green',
    apiCount: 18,
    isFavorite: false,
  },
  {
    id: 'member-portal',
    name: 'Member Portal API',
    description: 'Patient portal and member management system for healthcare organizations',
    icon: 'Users',
    color: 'purple',
    apiCount: 32,
    isFavorite: true,
  },
  {
    id: 'provider-directory',
    name: 'Provider Directory API',
    description: 'Healthcare provider directory and credential management platform',
    icon: 'Stethoscope',
    color: 'orange',
    apiCount: 16,
    isFavorite: false,
  },
  {
    id: 'insurance-claims',
    name: 'Insurance Claims API',
    description: 'Claims processing and insurance verification system for healthcare billing',
    icon: 'CreditCard',
    color: 'teal',
    apiCount: 28,
    isFavorite: false,
  },
  {
    id: 'pharmacy-network',
    name: 'Pharmacy Network API',
    description: 'Pharmacy network management and prescription processing platform',
    icon: 'Pill',
    color: 'pink',
    apiCount: 21,
    isFavorite: true,
  },
  {
    id: 'cael',
    name: 'CAEL',
    description: 'Real-time load testing integration with GitHub Actions workflow',
    icon: 'GitBranch',
    color: 'indigo',
    apiCount: 1,
    isFavorite: true,
    isRealIntegration: true,
  },
];

export const apiEndpointsByApp: Record<string, ApiEndpoint[]> = {
  'cdr-clinical': [
    {
      id: 'ep-1',
      method: 'GET',
      path: '/api/v1/patients',
      category: 'Patient Data',
      description: 'Retrieve patient information and basic demographics',
      estimatedResponseTime: '~120ms',
    },
    {
      id: 'ep-2',
      method: 'POST',
      path: '/api/v1/patients',
      category: 'Patient Data',
      description: 'Create new patient records with validation',
      estimatedResponseTime: '~250ms',
    },
    {
      id: 'ep-3',
      method: 'GET',
      path: '/api/v1/patients/{id}/records',
      category: 'Clinical Records',
      description: 'Fetch complete clinical history and medical records',
      estimatedResponseTime: '~340ms',
    },
    {
      id: 'ep-4',
      method: 'GET',
      path: '/api/v1/appointments',
      category: 'Appointments',
      description: 'List upcoming and past appointments',
      estimatedResponseTime: '~180ms',
    },
    {
      id: 'ep-5',
      method: 'POST',
      path: '/api/v1/appointments',
      category: 'Appointments',
      description: 'Schedule new patient appointments',
      estimatedResponseTime: '~290ms',
    },
    {
      id: 'ep-6',
      method: 'PUT',
      path: '/api/v1/patients/{id}/records',
      category: 'Clinical Records',
      description: 'Update existing clinical records and notes',
      estimatedResponseTime: '~380ms',
    },
    {
      id: 'ep-7',
      method: 'GET',
      path: '/api/v1/billing/invoices',
      category: 'Billing',
      description: 'Retrieve billing information and invoices',
      estimatedResponseTime: '~150ms',
    },
    {
      id: 'ep-8',
      method: 'DELETE',
      path: '/api/v1/patients/{id}',
      category: 'Patient Data',
      description: 'Remove patient records (GDPR compliance)',
      estimatedResponseTime: '~200ms',
    },
  ],
  'cael': [
    {
      id: 'ep-cael-1',
      method: 'GET',
      path: '/persons/033944599299665$/visits',
      category: 'Visits',
      description: 'Retrieve patient visit information from CDR Clinical API',
      estimatedResponseTime: '~200ms',
    },
  ],
};

export const testPresets = {
  light: { virtualUsers: 10, rampUpTime: 30, duration: 5, thinkTime: 2 },
  medium: { virtualUsers: 100, rampUpTime: 120, duration: 10, thinkTime: 3 },
  heavy: { virtualUsers: 500, rampUpTime: 240, duration: 20, thinkTime: 5 },
  stress: { virtualUsers: 1000, rampUpTime: 300, duration: 30, thinkTime: 1 },
};
