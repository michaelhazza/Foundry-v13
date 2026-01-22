import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2 } from 'lucide-react';

interface OrganizationForm {
  name: string;
}

export function OrganizationSettingsPage() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const { data: organization, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const response = await api.get('/organizations/current');
      return response.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<OrganizationForm>({
    values: {
      name: organization?.name || '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: OrganizationForm) => {
      const response = await api.patch('/organizations/current', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      refreshUser();
      toast({
        title: 'Organization updated',
        description: 'Your organization settings have been saved.',
      });
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const onSubmit = (data: OrganizationForm) => {
    setError(null);
    updateMutation.mutate(data);
  };

  if (user?.role !== 'admin') {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to access organization settings.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization's settings and preferences.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Organization Details</span>
            </CardTitle>
            <CardDescription>
              Basic information about your organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <div className="h-10 bg-muted rounded animate-pulse" />
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    {...register('name', {
                      required: 'Organization name is required',
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

                <Button
                  type="submit"
                  disabled={!isDirty || updateMutation.isPending}
                >
                  {updateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
            <CardDescription>
              Overview of your organization's usage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold">{organization?.stats?.projectCount || 0}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{organization?.stats?.userCount || 0}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Data Processed</p>
                <p className="text-2xl font-bold">{organization?.stats?.dataProcessed || '0 GB'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
