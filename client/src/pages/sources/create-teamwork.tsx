import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface CreateTeamworkSourceForm {
  name: string;
  description: string;
  baseUrl: string;
  apiKey: string;
}

export function CreateTeamworkSourcePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateTeamworkSourceForm>();

  const baseUrl = watch('baseUrl');
  const apiKey = watch('apiKey');

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/sources/test-connection', {
        type: 'teamwork',
        config: {
          baseUrl,
          apiKey,
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setTestResult(data.data);
    },
    onError: (err) => {
      setTestResult({
        success: false,
        message: getErrorMessage(err),
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateTeamworkSourceForm) => {
      const response = await api.post('/sources', {
        projectId: parseInt(projectId!, 10),
        name: data.name,
        type: 'teamwork',
        config: {
          baseUrl: data.baseUrl,
          apiKey: data.apiKey,
        },
        description: data.description,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-sources', projectId] });
      toast({
        title: 'Source created',
        description: 'Your Teamwork source has been created successfully.',
      });
      navigate(`/sources/${data.data.id}`);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const onSubmit = (data: CreateTeamworkSourceForm) => {
    setError(null);
    createMutation.mutate(data);
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Link to="/projects" className="text-muted-foreground hover:text-foreground">
              Projects
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link
              to={`/projects/${projectId}`}
              className="text-muted-foreground hover:text-foreground"
            >
              Project
            </Link>
            <span className="text-muted-foreground">/</span>
            <span>New Source</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Add Teamwork Source</h1>
          <p className="text-muted-foreground">
            Connect to your Teamwork account to import project data.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Source Details</CardTitle>
              <CardDescription>
                Enter a name and description for this data source.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Source Name</Label>
                <Input
                  id="name"
                  placeholder="My Teamwork Source"
                  {...register('name', {
                    required: 'Source name is required',
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
                  placeholder="Describe this data source..."
                  {...register('description')}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>API Connection</CardTitle>
              <CardDescription>
                Enter your Teamwork API credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="baseUrl">Teamwork Base URL</Label>
                <Input
                  id="baseUrl"
                  placeholder="https://yourcompany.teamwork.com"
                  {...register('baseUrl', {
                    required: 'Base URL is required',
                    pattern: {
                      value: /^https?:\/\/.+/,
                      message: 'Please enter a valid URL',
                    },
                  })}
                />
                {errors.baseUrl && (
                  <p className="text-sm text-destructive">{errors.baseUrl.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your Teamwork API key"
                  {...register('apiKey', {
                    required: 'API key is required',
                  })}
                />
                {errors.apiKey && (
                  <p className="text-sm text-destructive">{errors.apiKey.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  You can find your API key in Teamwork under Settings &gt; API &amp; Webhooks.
                </p>
              </div>

              {testResult && (
                <Alert variant={testResult.success ? 'default' : 'destructive'}>
                  <div className="flex items-center space-x-2">
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>{testResult.message}</AlertDescription>
                  </div>
                </Alert>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={!baseUrl || !apiKey || testMutation.isPending}
              >
                {testMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Test Connection
              </Button>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between mt-6">
            <Link to={`/projects/${projectId}`}>
              <Button type="button" variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Source
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
