import { Users, Clock, Timer, Brain, Target } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface TestConfigurationProps {
  config: {
    virtualUsers: number;
    rampUpTime: number;
    duration: number;
    thinkTime: number;
    responseTimeThreshold?: number;
    errorRateThreshold?: number;
  };
  onChange: (config: any) => void;
}

const presets = [
  { label: 'Light Load', value: 'light', users: 10 },
  { label: 'Medium Load', value: 'medium', users: 100 },
  { label: 'Heavy Load', value: 'heavy', users: 500 },
  { label: 'Stress Test', value: 'stress', users: 1000 },
];

const durationPresets = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
];

export function TestConfiguration({ config, onChange }: TestConfigurationProps) {
  const applyPreset = (preset: string) => {
    const presetConfig = {
      light: { virtualUsers: 10, rampUpTime: 30, duration: 5, thinkTime: 2 },
      medium: { virtualUsers: 100, rampUpTime: 120, duration: 10, thinkTime: 3 },
      heavy: { virtualUsers: 500, rampUpTime: 240, duration: 20, thinkTime: 5 },
      stress: { virtualUsers: 1000, rampUpTime: 300, duration: 30, thinkTime: 1 },
    }[preset];

    if (presetConfig) {
      onChange({ ...config, ...presetConfig });
    }
  };

  return (
    <div className="space-y-8" data-testid="test-configuration">
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-semibold">Virtual Users</h3>
                <p className="text-sm text-muted-foreground">Number of concurrent users to simulate</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    value={config.virtualUsers}
                    onChange={(e) => onChange({ ...config, virtualUsers: parseInt(e.target.value) || 0 })}
                    className="w-24"
                    data-testid="input-virtual-users"
                  />
                  <span className="text-sm text-muted-foreground">users</span>
                </div>
                <Slider
                  value={[config.virtualUsers]}
                  onValueChange={([value]) => onChange({ ...config, virtualUsers: value })}
                  min={1}
                  max={1000}
                  step={1}
                  data-testid="slider-virtual-users"
                />
                <div className="flex gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.value}
                      variant={config.virtualUsers === preset.users ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => applyPreset(preset.value)}
                      data-testid={`button-preset-${preset.value}`}
                    >
                      {preset.label}
                      <span className="ml-1 text-xs opacity-70">{preset.users} users</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-chart-4/10 p-2">
              <Clock className="h-5 w-5 text-chart-4" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-semibold">Test Duration & Ramp-up</h3>
                <p className="text-sm text-muted-foreground">Configure timing parameters for your load test</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ramp-up Duration</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={config.rampUpTime}
                      onChange={(e) => onChange({ ...config, rampUpTime: parseInt(e.target.value) || 0 })}
                      className="w-20"
                      data-testid="input-ramp-up"
                    />
                    <span className="text-sm text-muted-foreground">seconds</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Time to gradually increase to target user count (e.g., 30s, 120s, 300s)</p>
                </div>

                <div className="space-y-2">
                  <Label>Test Duration</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={config.duration}
                      onChange={(e) => onChange({ ...config, duration: parseInt(e.target.value) || 0 })}
                      className="w-20"
                      data-testid="input-duration"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Total duration to run the load test</p>
                </div>
              </div>

              <div className="flex gap-2">
                {durationPresets.map((preset) => (
                  <Button
                    key={preset.value}
                    variant={config.duration === preset.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onChange({ ...config, duration: preset.value })}
                    data-testid={`button-duration-${preset.value}`}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Accordion type="single" collapsible data-testid="accordion-advanced">
        <AccordionItem value="advanced">
          <AccordionTrigger className="hover-elevate rounded-lg px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-app-orange/10 p-2">
                <Target className="h-5 w-5 text-app-orange" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Advanced Configuration</h3>
                <p className="text-sm text-muted-foreground">Optional parameters for fine-tuning</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-4">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Think Time</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[config.thinkTime]}
                    onValueChange={([value]) => onChange({ ...config, thinkTime: value })}
                    min={0}
                    max={10}
                    step={0.5}
                    className="flex-1"
                    data-testid="slider-think-time"
                  />
                  <span className="w-16 text-sm">{config.thinkTime}s</span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Response Time Threshold</Label>
                    <p className="text-xs text-muted-foreground">&lt; 500ms (95th percentile)</p>
                  </div>
                  <Switch
                    checked={config.responseTimeThreshold !== undefined}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...config,
                        responseTimeThreshold: checked ? 500 : undefined,
                      })
                    }
                    data-testid="switch-response-threshold"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Error Rate Threshold</Label>
                    <p className="text-xs text-muted-foreground">&lt; 1%</p>
                  </div>
                  <Switch
                    checked={config.errorRateThreshold !== undefined}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...config,
                        errorRateThreshold: checked ? 1 : undefined,
                      })
                    }
                    data-testid="switch-error-threshold"
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
