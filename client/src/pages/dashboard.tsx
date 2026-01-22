import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import { Plus, FolderOpen, Activity, Database, ArrowRight } from 'lucide-react';

export function DashboardPage() {
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.get('/projects?limit=5');
      return response.data;
    },
  });

  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: ['recent-runs'],
    queryFn: async () => {
      const response = await api.get('/runs?limit=5');
      return response.data;
    },
  });

  const projects = projectsData?.data || [];
  const runs = runsData?.data || [];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'running':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's an overview of your data preparation activities.
            </p>
          </div>
          <Link to="/projects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projectsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  projectsData?.meta?.pagination?.totalCount || 0
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Runs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {runsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  runs.filter((r: any) => r.status === 'running').length
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Runs</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {runsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  runs.filter((r: any) => r.status === 'completed').length
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Datasets</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {runsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  runs.filter((r: any) => r.status === 'completed').length
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Projects</CardTitle>
                  <CardDescription>Your latest data preparation projects</CardDescription>
                </div>
                <Link to="/projects">
                  <Button variant="ghost" size="sm">
                    View all
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No projects yet. Create your first project to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project: any) => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatRelativeTime(project.updatedAt)}
                        </p>
                      </div>
                      <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                        {project.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Runs</CardTitle>
                  <CardDescription>Latest processing runs</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {runsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : runs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No runs yet. Start a processing run from a project.
                </div>
              ) : (
                <div className="space-y-4">
                  {runs.map((run: any) => (
                    <Link
                      key={run.id}
                      to={`/runs/${run.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div>
                        <p className="font-medium">Run #{run.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatRelativeTime(run.createdAt)}
                        </p>
                      </div>
                      <Badge variant={getStatusVariant(run.status)}>
                        {run.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
