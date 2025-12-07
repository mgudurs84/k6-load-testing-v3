import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminAppsProvider } from "@/contexts/AdminAppsContext";
import Dashboard from "@/pages/Dashboard";
import TestHistory from "@/pages/TestHistory";
import Admin from "@/pages/Admin";
import PubSub from "@/pages/PubSub";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/history" component={TestHistory} />
      <Route path="/admin" component={Admin} />
      <Route path="/pubsub" component={PubSub} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AdminAppsProvider>
          <Toaster />
          <Router />
        </AdminAppsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
