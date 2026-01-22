import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { api, getErrorMessage } from '@/lib/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { formatRelativeTime } from '@/lib/utils';
import { Plus, FolderOpen, Loader2, Search } from 'lucide-react';

interface CreateProjectForm {
  name: string;
  description: string;
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateProjectForm>();

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await api.get(`/projects?${params.toString()}`);
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateProjectForm) => {
      const response = await api.post('/projects', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Project created',
        description: 'Your new project has been created successfully.',
      });
      setDialogOpen(false);
      reset();
      navigate(`/projects/${data.data.id}`);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const onSubmit = (data: CreateProjectForm) => {
    setError(null);
    createMutation.mutate(data);
  };

  const projects = projectsData?.data || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Manage your data preparation projects
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit(onSubmit)}>
                <DialogHeader>
                  <DialogTitle>Create new project</DialogTitle>
                  <DialogDescription>
                    Create a new data preparation project to organize your sources and processing configurations.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      placeholder="My Data Project"
                      {...register('name', {
                        required: 'Project name is required',
                        minLength: {
                          value: 2,
                          message: 'Name must be at least 2 characters',
                        },
                      })}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your project..."
                      {...register('description')}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Project
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first project to start preparing data for AI.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: any) => (
              <Link key={project.id} to={`/projects/${project.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                        {project.status}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {project.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Updated {formatRelativeTime(project.updatedAt)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
