import { useState, useRef } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  MessageSquare,
  Upload,
  Play,
  Zap,
  CheckCircle2,
  AlertCircle,
  Cloud,
  Server,
  Send,
  FileJson,
  Trash2,
  Plus,
  Settings2,
  Activity,
  Clock,
  Users,
  Download,
  RefreshCw,
  Eye,
  Copy,
  Lock,
  Unlock,
} from 'lucide-react';
import { SiApachekafka, SiGooglecloud } from 'react-icons/si';

type Platform = 'kafka' | 'gcp';
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface TopicConfig {
  id: string;
  name: string;
  platform: Platform;
  kafkaConfig?: {
    bootstrapServers: string;
    apiKey: string;
    apiSecret: string;
    securityProtocol: string;
  };
  gcpConfig?: {
    projectId: string;
    credentialsJson: string;
  };
}

interface Message {
  id: string;
  content: string;
  key?: string;
  headers?: Record<string, string>;
}

export default function PubSub() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [platform, setPlatform] = useState<Platform>('kafka');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [activeSection, setActiveSection] = useState<'config' | 'messages' | 'loadtest'>('config');
  
  const [kafkaConfig, setKafkaConfig] = useState({
    bootstrapServers: '',
    apiKey: '',
    apiSecret: '',
    topicName: '',
    securityProtocol: 'SASL_SSL',
  });
  
  const [gcpConfig, setGcpConfig] = useState({
    projectId: '',
    topicName: '',
    credentialsJson: '',
  });
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageKey, setMessageKey] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  
  const [loadTestConfig, setLoadTestConfig] = useState({
    virtualUsers: 50,
    duration: 5,
    messagesPerSecond: 100,
    rampUpTime: 30,
  });
  
  const [registeredTopics, setRegisteredTopics] = useState<TopicConfig[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [showSecrets, setShowSecrets] = useState(false);

  const handleTestConnection = async () => {
    setConnectionStatus('connecting');
    
    try {
      const endpoint = platform === 'kafka' 
        ? '/api/pubsub/kafka/test-connection'
        : '/api/pubsub/gcp/test-connection';
      
      const payload = platform === 'kafka'
        ? {
            bootstrapServers: kafkaConfig.bootstrapServers,
            apiKey: kafkaConfig.apiKey,
            apiSecret: kafkaConfig.apiSecret,
            securityProtocol: kafkaConfig.securityProtocol,
          }
        : {
            projectId: gcpConfig.projectId,
            credentialsJson: gcpConfig.credentialsJson,
          };
      
      const response = await apiRequest('POST', endpoint, payload);
      
      const data = await response.json();
      
      if (data.success) {
        setConnectionStatus('connected');
        toast({
          title: "Connection Successful",
          description: data.message || `Connected to ${platform === 'kafka' ? 'Confluent Kafka' : 'Google Pub/Sub'} successfully!`,
        });
      } else {
        throw new Error(data.error || 'Connection failed');
      }
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Please check your credentials and try again.",
        variant: "destructive",
      });
    }
  };

  const handleRegisterTopic = async () => {
    const topicName = platform === 'kafka' ? kafkaConfig.topicName : gcpConfig.topicName;
    
    if (!topicName) {
      toast({
        title: "Topic Name Required",
        description: "Please enter a topic name to register.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await apiRequest('POST', '/api/pubsub/topics', {
        name: topicName,
        platform,
        kafkaConfig: platform === 'kafka' ? { ...kafkaConfig } : undefined,
        gcpConfig: platform === 'gcp' ? { ...gcpConfig } : undefined,
      });
      
      const newTopic = await response.json();
      
      setRegisteredTopics(prev => [...prev, newTopic]);
      setSelectedTopic(newTopic.id);
      
      toast({
        title: "Topic Registered",
        description: `Topic "${topicName}" has been registered successfully.`,
      });
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Failed to register topic.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        const newMessages: Message[] = Array.isArray(parsed) 
          ? parsed.map((msg, index) => ({
              id: `msg-${Date.now()}-${index}`,
              content: typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2),
            }))
          : [{
              id: `msg-${Date.now()}`,
              content: JSON.stringify(parsed, null, 2),
            }];
        
        setMessages(prev => [...prev, ...newMessages]);
        
        toast({
          title: "Messages Loaded",
          description: `${newMessages.length} message(s) loaded from file.`,
        });
      } catch {
        toast({
          title: "Invalid JSON",
          description: "The file must contain valid JSON.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddMessage = () => {
    if (!newMessage.trim()) return;
    
    try {
      JSON.parse(newMessage);
      
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        content: newMessage,
        key: messageKey || undefined,
      }]);
      
      setNewMessage('');
      setMessageKey('');
    } catch {
      toast({
        title: "Invalid JSON",
        description: "Please enter valid JSON for the message.",
        variant: "destructive",
      });
    }
  };

  const handleSendMessages = async () => {
    if (messages.length === 0) {
      toast({
        title: "No Messages",
        description: "Please add messages before sending.",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedTopic) {
      toast({
        title: "No Topic Selected",
        description: "Please register and select a topic first.",
        variant: "destructive",
      });
      return;
    }
    
    const topic = registeredTopics.find(t => t.id === selectedTopic);
    if (!topic) return;
    
    setIsSending(true);
    setSendProgress(0);
    
    try {
      const endpoint = topic.platform === 'kafka' 
        ? '/api/pubsub/kafka/send'
        : '/api/pubsub/gcp/send';
      
      const parsedMessages = messages.map(msg => ({
        key: msg.key,
        value: JSON.parse(msg.content),
      }));
      
      const response = await apiRequest('POST', endpoint, {
        topicId: selectedTopic,
        messages: parsedMessages,
        kafkaConfig: topic.kafkaConfig,
        gcpConfig: topic.gcpConfig,
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSendProgress(100);
        toast({
          title: "Messages Sent",
          description: `Successfully sent ${data.messagesSent} message(s) to the topic.`,
        });
        setMessages([]);
      } else {
        throw new Error(data.error || 'Failed to send messages');
      }
    } catch (error) {
      toast({
        title: "Send Failed",
        description: error instanceof Error ? error.message : "Failed to send messages.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateK6Script = async () => {
    const topic = registeredTopics.find(t => t.id === selectedTopic);
    if (!topic) {
      toast({
        title: "No Topic Selected",
        description: "Please register and select a topic first.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await apiRequest('POST', '/api/pubsub/k6/generate-script', {
        platform: topic.platform,
        topicName: topic.name,
        config: loadTestConfig,
        producerApiUrl: 'http://localhost:8080',
      });
      
      const data = await response.json();
      
      if (data.success && data.script) {
        const blob = new Blob([data.script], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `k6-pubsub-${topic.name}-${Date.now()}.js`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast({
          title: "K6 Script Generated",
          description: "Download started for your load test script.",
        });
      }
    } catch (error) {
      toast({
        title: "Script Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate K6 script.",
        variant: "destructive",
      });
    }
  };

  const handleTriggerLoadTest = async () => {
    const topic = registeredTopics.find(t => t.id === selectedTopic);
    if (!topic) {
      toast({
        title: "No Topic Selected",
        description: "Please register and select a topic first.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await apiRequest('POST', '/api/pubsub/trigger-loadtest', {
        platform: topic.platform,
        topicName: topic.name,
        config: loadTestConfig,
      });
      
      const data = await response.json();
      
      toast({
        title: "Load Test Triggered",
        description: `Test ${data.testId} has been queued for execution.`,
      });
    } catch (error) {
      toast({
        title: "Load Test Failed",
        description: error instanceof Error ? error.message : "Failed to trigger load test.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-chart-2 to-chart-3">
              <MessageSquare className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-pubsub-title">Pub/Sub Testing</h1>
              <p className="text-muted-foreground">
                Test message publishing to Kafka or Google Pub/Sub with K6 load testing
              </p>
            </div>
          </div>
        </div>

        <Tabs value={platform} onValueChange={(v) => setPlatform(v as Platform)} className="mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="kafka" className="gap-2" data-testid="tab-kafka">
              <SiApachekafka className="h-4 w-4" />
              Confluent Kafka
            </TabsTrigger>
            <TabsTrigger value="gcp" className="gap-2" data-testid="tab-gcp">
              <SiGooglecloud className="h-4 w-4" />
              Google Pub/Sub
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as any)}>
              <TabsList className="mb-6">
                <TabsTrigger value="config" className="gap-2" data-testid="tab-config">
                  <Settings2 className="h-4 w-4" />
                  Configuration
                </TabsTrigger>
                <TabsTrigger value="messages" className="gap-2" data-testid="tab-messages">
                  <FileJson className="h-4 w-4" />
                  Messages
                </TabsTrigger>
                <TabsTrigger value="loadtest" className="gap-2" data-testid="tab-loadtest">
                  <Zap className="h-4 w-4" />
                  Load Test
                </TabsTrigger>
              </TabsList>

              <TabsContent value="config" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {platform === 'kafka' ? (
                        <>
                          <Server className="h-5 w-5 text-chart-1" />
                          Kafka Connection Settings
                        </>
                      ) : (
                        <>
                          <Cloud className="h-5 w-5 text-chart-2" />
                          Google Cloud Settings
                        </>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Configure your {platform === 'kafka' ? 'Confluent Kafka' : 'Google Pub/Sub'} connection
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {platform === 'kafka' ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="bootstrap-servers">Bootstrap Servers</Label>
                          <Input
                            id="bootstrap-servers"
                            placeholder="pkc-xxxxx.us-east-1.aws.confluent.cloud:9092"
                            value={kafkaConfig.bootstrapServers}
                            onChange={(e) => setKafkaConfig(prev => ({ ...prev, bootstrapServers: e.target.value }))}
                            data-testid="input-bootstrap-servers"
                          />
                        </div>
                        
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="api-key">API Key</Label>
                            <div className="relative">
                              <Input
                                id="api-key"
                                type={showSecrets ? 'text' : 'password'}
                                placeholder="Enter API Key"
                                value={kafkaConfig.apiKey}
                                onChange={(e) => setKafkaConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                                data-testid="input-api-key"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="api-secret">API Secret</Label>
                            <Input
                              id="api-secret"
                              type={showSecrets ? 'text' : 'password'}
                              placeholder="Enter API Secret"
                              value={kafkaConfig.apiSecret}
                              onChange={(e) => setKafkaConfig(prev => ({ ...prev, apiSecret: e.target.value }))}
                              data-testid="input-api-secret"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={showSecrets}
                            onCheckedChange={setShowSecrets}
                            data-testid="switch-show-secrets"
                          />
                          <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                            {showSecrets ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            {showSecrets ? 'Hide' : 'Show'} credentials
                          </Label>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="security-protocol">Security Protocol</Label>
                          <Select
                            value={kafkaConfig.securityProtocol}
                            onValueChange={(v) => setKafkaConfig(prev => ({ ...prev, securityProtocol: v }))}
                          >
                            <SelectTrigger data-testid="select-security-protocol">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SASL_SSL">SASL_SSL</SelectItem>
                              <SelectItem value="SASL_PLAINTEXT">SASL_PLAINTEXT</SelectItem>
                              <SelectItem value="SSL">SSL</SelectItem>
                              <SelectItem value="PLAINTEXT">PLAINTEXT</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="topic-name">Topic Name</Label>
                          <Input
                            id="topic-name"
                            placeholder="my-healthcare-events"
                            value={kafkaConfig.topicName}
                            onChange={(e) => setKafkaConfig(prev => ({ ...prev, topicName: e.target.value }))}
                            data-testid="input-topic-name"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="project-id">Google Cloud Project ID</Label>
                          <Input
                            id="project-id"
                            placeholder="my-gcp-project-123"
                            value={gcpConfig.projectId}
                            onChange={(e) => setGcpConfig(prev => ({ ...prev, projectId: e.target.value }))}
                            data-testid="input-project-id"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="gcp-topic-name">Topic Name</Label>
                          <Input
                            id="gcp-topic-name"
                            placeholder="projects/my-project/topics/my-topic"
                            value={gcpConfig.topicName}
                            onChange={(e) => setGcpConfig(prev => ({ ...prev, topicName: e.target.value }))}
                            data-testid="input-gcp-topic-name"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="credentials-json">Service Account Credentials (JSON)</Label>
                          <Textarea
                            id="credentials-json"
                            placeholder='Paste your service account JSON credentials here...'
                            className="font-mono text-sm min-h-32"
                            value={gcpConfig.credentialsJson}
                            onChange={(e) => setGcpConfig(prev => ({ ...prev, credentialsJson: e.target.value }))}
                            data-testid="textarea-credentials-json"
                          />
                        </div>
                      </>
                    )}
                    
                    <div className="flex items-center gap-3 pt-4">
                      <Button
                        onClick={handleTestConnection}
                        disabled={connectionStatus === 'connecting'}
                        className="gap-2"
                        data-testid="button-test-connection"
                      >
                        {connectionStatus === 'connecting' ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : connectionStatus === 'connected' ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : connectionStatus === 'error' ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                        {connectionStatus === 'connecting' ? 'Testing...' : 'Test Connection'}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={handleRegisterTopic}
                        disabled={connectionStatus !== 'connected'}
                        className="gap-2"
                        data-testid="button-register-topic"
                      >
                        <Plus className="h-4 w-4" />
                        Register Topic
                      </Button>
                      
                      {connectionStatus === 'connected' && (
                        <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </Badge>
                      )}
                      {connectionStatus === 'error' && (
                        <Badge variant="outline" className="gap-1 text-red-600 border-red-200 bg-red-50">
                          <AlertCircle className="h-3 w-3" />
                          Failed
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="messages" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileJson className="h-5 w-5 text-chart-3" />
                      Message Composer
                    </CardTitle>
                    <CardDescription>
                      Add messages individually or upload a JSON file with multiple messages
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FileJson className="h-4 w-4 text-chart-2" />
                        <span className="font-medium text-sm">FHIR Sample Templates</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => window.open('/samples/fhir-encounter-bundle.json', '_blank')}
                          data-testid="button-sample-encounter"
                        >
                          <Download className="h-3 w-3" />
                          Encounter
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => window.open('/samples/fhir-lab-report-bundle.json', '_blank')}
                          data-testid="button-sample-lab-report"
                        >
                          <Download className="h-3 w-3" />
                          Lab Report (CBC)
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => window.open('/samples/fhir-allergy-bundle.json', '_blank')}
                          data-testid="button-sample-allergy"
                        >
                          <Download className="h-3 w-3" />
                          Allergies
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => window.open('/samples/fhir-bulk-messages.json', '_blank')}
                          data-testid="button-sample-bulk"
                        >
                          <Download className="h-3 w-3" />
                          Bulk Messages
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Download sample FHIR bundles to use as message templates
                      </p>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-24 flex-col gap-2 border-dashed"
                        data-testid="button-upload-file"
                      >
                        <Upload className="h-6 w-6" />
                        <span>Upload JSON File</span>
                        <span className="text-xs text-muted-foreground">Supports arrays of messages</span>
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      
                      <div className="h-24 rounded-lg border border-dashed flex flex-col items-center justify-center gap-1">
                        <span className="font-medium">{messages.length}</span>
                        <span className="text-xs text-muted-foreground">Messages queued</span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="message-key">Message Key (Optional)</Label>
                        <Input
                          id="message-key"
                          placeholder="patient-001"
                          value={messageKey}
                          onChange={(e) => setMessageKey(e.target.value)}
                          data-testid="input-message-key"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="message-content">Message Content (JSON)</Label>
                        <Textarea
                          id="message-content"
                          placeholder='{"patientId": "P001", "eventType": "vitals", "data": {"heartRate": 72}}'
                          className="font-mono text-sm min-h-32"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          data-testid="textarea-message-content"
                        />
                      </div>
                      
                      <Button onClick={handleAddMessage} className="gap-2" data-testid="button-add-message">
                        <Plus className="h-4 w-4" />
                        Add Message
                      </Button>
                    </div>
                    
                    {messages.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Queued Messages</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMessages([])}
                            className="gap-1 text-destructive hover:text-destructive"
                            data-testid="button-clear-messages"
                          >
                            <Trash2 className="h-3 w-3" />
                            Clear All
                          </Button>
                        </div>
                        
                        <div className="max-h-64 overflow-auto space-y-2 rounded-lg border p-3">
                          {messages.map((msg, index) => (
                            <div
                              key={msg.id}
                              className="flex items-start gap-3 rounded-md bg-muted/50 p-3"
                              data-testid={`message-item-${index}`}
                            >
                              <Badge variant="outline" className="shrink-0">
                                {index + 1}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                {msg.key && (
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Key: {msg.key}
                                  </div>
                                )}
                                <pre className="text-xs font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                                  {msg.content.length > 100 ? msg.content.slice(0, 100) + '...' : msg.content}
                                </pre>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setMessages(prev => prev.filter(m => m.id !== msg.id))}
                                className="shrink-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {isSending && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Sending messages...</span>
                          <span>{sendProgress}%</span>
                        </div>
                        <Progress value={sendProgress} />
                      </div>
                    )}
                    
                    <Button
                      onClick={handleSendMessages}
                      disabled={messages.length === 0 || isSending || connectionStatus !== 'connected'}
                      className="w-full gap-2"
                      size="lg"
                      data-testid="button-send-messages"
                    >
                      <Send className="h-5 w-5" />
                      Send {messages.length} Message{messages.length !== 1 ? 's' : ''} to Topic
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="loadtest" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-chart-4" />
                      K6 Load Test Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure and generate K6 scripts to stress test your message producer
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Virtual Users
                          </Label>
                          <span className="text-2xl font-bold text-primary">{loadTestConfig.virtualUsers}</span>
                        </div>
                        <Slider
                          value={[loadTestConfig.virtualUsers]}
                          onValueChange={([v]) => setLoadTestConfig(prev => ({ ...prev, virtualUsers: v }))}
                          min={1}
                          max={500}
                          step={1}
                          data-testid="slider-virtual-users"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>1</span>
                          <span>500</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Duration (minutes)
                          </Label>
                          <span className="text-2xl font-bold text-primary">{loadTestConfig.duration}m</span>
                        </div>
                        <Slider
                          value={[loadTestConfig.duration]}
                          onValueChange={([v]) => setLoadTestConfig(prev => ({ ...prev, duration: v }))}
                          min={1}
                          max={60}
                          step={1}
                          data-testid="slider-duration"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>1m</span>
                          <span>60m</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Messages/Second
                          </Label>
                          <span className="text-2xl font-bold text-primary">{loadTestConfig.messagesPerSecond}</span>
                        </div>
                        <Slider
                          value={[loadTestConfig.messagesPerSecond]}
                          onValueChange={([v]) => setLoadTestConfig(prev => ({ ...prev, messagesPerSecond: v }))}
                          min={1}
                          max={1000}
                          step={10}
                          data-testid="slider-messages-per-second"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>1</span>
                          <span>1000</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Ramp-up (seconds)
                          </Label>
                          <span className="text-2xl font-bold text-primary">{loadTestConfig.rampUpTime}s</span>
                        </div>
                        <Slider
                          value={[loadTestConfig.rampUpTime]}
                          onValueChange={([v]) => setLoadTestConfig(prev => ({ ...prev, rampUpTime: v }))}
                          min={0}
                          max={300}
                          step={10}
                          data-testid="slider-ramp-up"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>0s</span>
                          <span>300s</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 pt-4 border-t">
                      <Button
                        onClick={handleGenerateK6Script}
                        disabled={registeredTopics.length === 0}
                        className="gap-2"
                        data-testid="button-generate-k6"
                      >
                        <Download className="h-4 w-4" />
                        Download K6 Script
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={handleTriggerLoadTest}
                        disabled={registeredTopics.length === 0}
                        className="gap-2"
                        data-testid="button-trigger-loadtest"
                      >
                        <Play className="h-4 w-4" />
                        Trigger Load Test
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Server className="h-5 w-5" />
                  Registered Topics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {registeredTopics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No topics registered yet</p>
                    <p className="text-xs mt-1">Configure and test your connection first</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {registeredTopics.map((topic) => (
                      <div
                        key={topic.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          selectedTopic === topic.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedTopic(topic.id)}
                        data-testid={`topic-item-${topic.id}`}
                      >
                        {topic.platform === 'kafka' ? (
                          <SiApachekafka className="h-5 w-5 shrink-0" />
                        ) : (
                          <SiGooglecloud className="h-5 w-5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{topic.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {topic.platform === 'kafka' ? 'Confluent Kafka' : 'Google Pub/Sub'}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await apiRequest('DELETE', `/api/pubsub/topics/${topic.id}`);
                              setRegisteredTopics(prev => prev.filter(t => t.id !== topic.id));
                              if (selectedTopic === topic.id) {
                                setSelectedTopic('');
                              }
                              toast({
                                title: "Topic Deleted",
                                description: `Topic "${topic.name}" has been removed.`,
                              });
                            } catch (error) {
                              toast({
                                title: "Delete Failed",
                                description: error instanceof Error ? error.message : "Failed to delete topic.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Platform</span>
                  <Badge variant="outline">
                    {platform === 'kafka' ? 'Kafka' : 'GCP Pub/Sub'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Connection</span>
                  <Badge 
                    variant="outline"
                    className={
                      connectionStatus === 'connected' 
                        ? 'text-green-600 border-green-200' 
                        : connectionStatus === 'error'
                        ? 'text-red-600 border-red-200'
                        : ''
                    }
                  >
                    {connectionStatus === 'connected' ? 'Active' : 
                     connectionStatus === 'error' ? 'Failed' :
                     connectionStatus === 'connecting' ? 'Testing...' : 'Not Connected'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Topics</span>
                  <Badge variant="outline">{registeredTopics.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Queued Messages</span>
                  <Badge variant="outline">{messages.length}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/5 via-chart-2/5 to-chart-3/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="h-5 w-5" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    1
                  </div>
                  <p className="text-muted-foreground">
                    Configure your Kafka or Pub/Sub connection
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    2
                  </div>
                  <p className="text-muted-foreground">
                    Test connection and register your topic
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    3
                  </div>
                  <p className="text-muted-foreground">
                    Upload or compose messages to send
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    4
                  </div>
                  <p className="text-muted-foreground">
                    Generate K6 scripts for load testing
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
