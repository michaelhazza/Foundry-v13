import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';
import {
  Trash2,
  RefreshCw,
  Database,
  FileCode,
  Loader2,
  ArrowLeft,
  Settings,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export function SourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: source, isLoading } = useQuery({
    queryKey: ['source', id],
    queryFn: async () => {
      const response = await api.get(`/sources/${id}`);
      return response.data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      toast({
        title: 'Source deleted',
        description: 'The source has been deleted successfully.',
      });
      navigate(`/projects/${source.projectId}`);
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(err),
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/sources/${id}/test`);
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: data.data.success ? 'Connection successful' : 'Connection failed',
        description: data.data.message,
        variant: data.data.success ? 'default' : 'destructive',
      });
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(err),
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/sources/${id}/sync`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source', id] });
      toast({
        title: 'Sync started',
        description: 'Source synchronization has been initiated.',
      });
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(err),
      });
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!source) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-2xl font-bold mb-4">Source not found</h2>
          <Link to="/projects">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Link to="/projects" className="text-muted-foreground hover:text-foreground">
                Projects
              </Link>
              <span className="text-muted-foreground">/</span>
              <Link
                to={`/projects/${source.projectId}`}
                className="text-muted-foreground hover:text-foreground"
              >
                Project
              </Link>
              <span className="text-muted-foreground">/</span>
              <span>{source.name}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{source.name}</h1>
            <p className="text-muted-foreground">
              {source.type} data source
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => testConnectionMutation.mutate()}
              disabled={testConnectionMutation.isPending}
            >
              {testConnectionMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Test Connection
            </Button>
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync Now
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge variant={source.status === 'active' ? 'success' : 'secondary'}>
                  {source.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Type</CardTitle>
              <FileCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{source.type}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Synced</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {source.lastSyncedAt
                  ? formatDateTime(source.lastSyncedAt)
                  : 'Never'}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="config" className="space-y-4">
          <TabsList>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="schema">Schema Mapping</TabsTrigger>
            <TabsTrigger value="deidentification">De-identification</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Connection Settings</CardTitle>
                <CardDescription>
                  API connection configuration for this data source.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium">Base URL</p>
                    <p className="text-sm text-muted-foreground">
                      {source.config?.baseUrl || 'Not configured'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">API Key</p>
                    <p className="text-sm text-muted-foreground">
                      {source.config?.apiKey ? '••••••••' : 'Not configured'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schema" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Schema Mapping</CardTitle>
                <CardDescription>
                  Configure how source fields map to the output schema.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {source.schemaMapping ? (
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
                    {JSON.stringify(source.schemaMapping, null, 2)}
                  </pre>
                ) : (
                  <p className="text-muted-foreground">
                    No schema mapping configured. Run a sync to auto-detect the schema.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deidentification" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>De-identification Rules</CardTitle>
                <CardDescription>
                  Configure how sensitive data will be handled during processing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {source.deidentificationConfig ? (
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
                    {JSON.stringify(source.deidentificationConfig, null, 2)}
                  </pre>
                ) : (
                  <p className="text-muted-foreground">
                    No de-identification rules configured.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete source</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this source? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete Source
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
