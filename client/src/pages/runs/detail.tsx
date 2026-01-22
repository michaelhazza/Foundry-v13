import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import {
  ArrowLeft,
  Clock,
  Database,
  CheckCircle,
  XCircle,
  Loader2,
  FileDown,
  AlertTriangle,
} from 'lucide-react';

export function RunDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: run, isLoading } = useQuery({
    queryKey: ['run', id],
    queryFn: async () => {
      const response = await api.get(`/runs/${id}`);
      return response.data.data;
    },
    refetchInterval: (data) => {
      if (data?.status === 'running' || data?.status === 'pending') {
        return 5000;
      }
      return false;
    },
  });

  const { data: logsData } = useQuery({
    queryKey: ['run-logs', id],
    queryFn: async () => {
      const response = await api.get(`/runs/${id}/logs`);
      return response.data;
    },
    enabled: !!run,
    refetchInterval: run?.status === 'running' ? 5000 : false,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'destructive';
      case 'running':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const logs = logsData?.data || [];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!run) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-2xl font-bold mb-4">Run not found</h2>
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

  const progress = run.progress || 0;
  const duration = run.completedAt
    ? new Date(run.completedAt).getTime() - new Date(run.startedAt || run.createdAt).getTime()
    : run.startedAt
    ? Date.now() - new Date(run.startedAt).getTime()
    : 0;
  const durationMinutes = Math.floor(duration / 60000);
  const durationSeconds = Math.floor((duration % 60000) / 1000);

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
                to={`/projects/${run.projectId}`}
                className="text-muted-foreground hover:text-foreground"
              >
                Project
              </Link>
              <span className="text-muted-foreground">/</span>
              <span>Run #{run.id}</span>
            </div>
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold tracking-tight">Processing Run #{run.id}</h1>
              <Badge variant={getStatusVariant(run.status)}>
                <span className="flex items-center space-x-1">
                  {getStatusIcon(run.status)}
                  <span className="ml-1">{run.status}</span>
                </span>
              </Badge>
            </div>
          </div>
          {run.status === 'completed' && run.datasetId && (
            <Link to={`/datasets/${run.datasetId}`}>
              <Button>
                <FileDown className="mr-2 h-4 w-4" />
                View Dataset
              </Button>
            </Link>
          )}
        </div>

        {(run.status === 'running' || run.status === 'pending') && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Started</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {run.startedAt ? formatDateTime(run.startedAt) : 'Not started'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {durationMinutes}m {durationSeconds}s
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Records Processed</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {run.recordsProcessed?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Errors</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {run.errorCount || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {run.error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center space-x-2">
                <XCircle className="h-5 w-5" />
                <span>Error Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-destructive/10 p-4 rounded-lg overflow-auto text-sm text-destructive">
                {run.error}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Processing Logs</CardTitle>
            <CardDescription>
              Real-time logs from the processing run.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No logs available yet.
              </p>
            ) : (
              <div className="bg-muted rounded-lg p-4 max-h-96 overflow-auto font-mono text-sm">
                {logs.map((log: any, index: number) => (
                  <div
                    key={index}
                    className={`py-1 ${
                      log.level === 'error'
                        ? 'text-destructive'
                        : log.level === 'warn'
                        ? 'text-yellow-500'
                        : ''
                    }`}
                  >
                    <span className="text-muted-foreground">
                      [{formatDateTime(log.timestamp)}]
                    </span>{' '}
                    <span className="uppercase font-medium">[{log.level}]</span>{' '}
                    {log.message}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
