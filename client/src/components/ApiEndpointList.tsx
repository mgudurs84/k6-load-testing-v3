import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { ApiEndpoint } from '@shared/mock-data';

interface ApiEndpointListProps {
  endpoints: ApiEndpoint[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

const methodColors: Record<string, string> = {
  GET: 'bg-method-get/10 text-method-get border-method-get/20',
  POST: 'bg-method-post/10 text-method-post border-method-post/20',
  PUT: 'bg-method-put/10 text-method-put border-method-put/20',
  DELETE: 'bg-method-delete/10 text-method-delete border-method-delete/20',
  PATCH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  HEAD: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  OPTIONS: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

export function ApiEndpointList({
  endpoints,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
}: ApiEndpointListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEndpoints = endpoints.filter(
    (ep) =>
      ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedByCategory = filteredEndpoints.reduce(
    (acc, ep) => {
      if (!acc[ep.category]) acc[ep.category] = [];
      acc[ep.category].push(ep);
      return acc;
    },
    {} as Record<string, ApiEndpoint[]>
  );

  return (
    <div className="space-y-4" data-testid="api-endpoint-list">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search APIs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-apis"
          />
        </div>
        <Button
          variant="default"
          onClick={onSelectAll}
          data-testid="button-select-all"
        >
          Select All
        </Button>
        <Button
          variant="outline"
          onClick={onClearAll}
          data-testid="button-clear-all"
        >
          Clear All
        </Button>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedByCategory).map(([category, categoryEndpoints]) => (
          <div key={category} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {category}
            </h3>
            <div className="space-y-2">
              {categoryEndpoints.map((endpoint) => (
                <div
                  key={endpoint.id}
                  className="flex items-center gap-4 rounded-lg border p-4 hover-elevate"
                  data-testid={`api-endpoint-${endpoint.id}`}
                >
                  <Checkbox
                    checked={selectedIds.includes(endpoint.id)}
                    onCheckedChange={() => onToggle(endpoint.id)}
                    data-testid={`checkbox-api-${endpoint.id}`}
                  />
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Badge className={`border ${methodColors[endpoint.method]}`} variant="outline">
                      {endpoint.method}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <code className="block truncate font-mono text-sm" data-testid={`text-api-path-${endpoint.id}`}>
                        {endpoint.path}
                      </code>
                      <p className="truncate text-xs text-muted-foreground">{endpoint.description}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{endpoint.estimatedResponseTime}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
