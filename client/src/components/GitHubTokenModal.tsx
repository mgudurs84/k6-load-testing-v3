import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Lock } from 'lucide-react';

interface GitHubTokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (token: string) => void;
}

export function GitHubTokenModal({ open, onOpenChange, onSubmit }: GitHubTokenModalProps) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!token.trim()) {
      setError('GitHub token is required');
      return;
    }

    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
      setError('Invalid GitHub token format');
      return;
    }

    setError('');
    onSubmit(token);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-github-token">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            GitHub Authentication Required
          </DialogTitle>
          <DialogDescription>
            Enter your GitHub Personal Access Token to trigger the CAEL load testing workflow
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your token will be stored securely and used to authenticate with GitHub Actions API
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="github-token">GitHub Personal Access Token</Label>
            <Input
              id="github-token"
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setError('');
              }}
              data-testid="input-github-token"
            />
            {error && (
              <p className="text-sm text-destructive" data-testid="text-token-error">
                {error}
              </p>
            )}
          </div>

          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="mb-2 font-medium">Required Token Permissions:</p>
            <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
              <li>repo (Full control of private repositories)</li>
              <li>workflow (Update GitHub Action workflows)</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-token"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            data-testid="button-submit-token"
          >
            Connect & Trigger Test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
