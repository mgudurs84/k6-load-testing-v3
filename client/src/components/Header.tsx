import { Bell, Search, Home, History, Settings, MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function Header() {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-6">
        <Link href="/" className="flex items-center gap-3 hover-elevate rounded-lg px-2 py-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-chart-2">
            <span className="text-lg font-bold text-white">CP</span>
          </div>
          <span className="text-lg font-semibold">CDR Pulse</span>
        </Link>

        <nav className="flex gap-2">
          <a href="/" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }}>
            <Button
              variant={location === '/' ? 'default' : 'ghost'}
              size="sm"
              className="gap-2"
              data-testid="button-nav-home"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </a>
          <a href="/history" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/history'); window.dispatchEvent(new PopStateEvent('popstate')); }}>
            <Button
              variant={location === '/history' ? 'default' : 'ghost'}
              size="sm"
              className="gap-2"
              data-testid="button-nav-history"
            >
              <History className="h-4 w-4" />
              Test History
            </Button>
          </a>
          <a href="/pubsub" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/pubsub'); window.dispatchEvent(new PopStateEvent('popstate')); }}>
            <Button
              variant={location === '/pubsub' ? 'default' : 'ghost'}
              size="sm"
              className="gap-2"
              data-testid="button-nav-pubsub"
            >
              <MessageSquare className="h-4 w-4" />
              Pub/Sub
            </Button>
          </a>
          <a href="/admin" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/admin'); window.dispatchEvent(new PopStateEvent('popstate')); }}>
            <Button
              variant={location === '/admin' ? 'default' : 'ghost'}
              size="sm"
              className="gap-2"
              data-testid="button-nav-admin"
            >
              <Settings className="h-4 w-4" />
              Admin
            </Button>
          </a>
        </nav>

        <div className="mx-auto w-full max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full rounded-full pl-9"
              data-testid="input-search"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            className="hover-elevate active-elevate-2 rounded-full p-2"
            data-testid="button-notifications"
          >
            <Bell className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <Avatar data-testid="avatar-user">
              <AvatarImage src="" alt="Sarah Chen" />
              <AvatarFallback className="bg-primary text-primary-foreground">
                SC
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">Sarah Chen</span>
          </div>
        </div>
      </div>
    </header>
  );
}
