import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Lock } from 'lucide-react';

interface ProfileForm {
  name: string;
  email: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isDirty: profileDirty },
  } = useForm<ProfileForm>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    watch,
    formState: { errors: passwordErrors },
  } = useForm<PasswordForm>();

  const newPassword = watch('newPassword');

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const response = await api.patch('/auth/profile', data);
      return response.data;
    },
    onSuccess: () => {
      refreshUser();
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    },
    onError: (err) => {
      setProfileError(getErrorMessage(err));
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordForm) => {
      const response = await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return response.data;
    },
    onSuccess: () => {
      resetPassword();
      toast({
        title: 'Password changed',
        description: 'Your password has been changed successfully.',
      });
    },
    onError: (err) => {
      setPasswordError(getErrorMessage(err));
    },
  });

  const onProfileSubmit = (data: ProfileForm) => {
    setProfileError(null);
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordForm) => {
    setPasswordError(null);
    changePasswordMutation.mutate(data);
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Personal Information</span>
            </CardTitle>
            <CardDescription>
              Update your personal details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
              {profileError && (
                <Alert variant="destructive">
                  <AlertDescription>{profileError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  {...registerProfile('name', {
                    required: 'Name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                  })}
                />
                {profileErrors.name && (
                  <p className="text-sm text-destructive">{profileErrors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...registerProfile('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                />
                {profileErrors.email && (
                  <p className="text-sm text-destructive">{profileErrors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Organization</Label>
                <Input value={user?.organization?.name || ''} disabled />
                <p className="text-xs text-muted-foreground">
                  Contact an admin to change your organization.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={user?.role || ''} disabled className="capitalize" />
              </div>

              <Button
                type="submit"
                disabled={!profileDirty || updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <span>Change Password</span>
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
              {passwordError && (
                <Alert variant="destructive">
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...registerPassword('currentPassword', {
                    required: 'Current password is required',
                  })}
                />
                {passwordErrors.currentPassword && (
                  <p className="text-sm text-destructive">
                    {passwordErrors.currentPassword.message}
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...registerPassword('newPassword', {
                    required: 'New password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: 'Password must contain uppercase, lowercase, and number',
                    },
                  })}
                />
                {passwordErrors.newPassword && (
                  <p className="text-sm text-destructive">
                    {passwordErrors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...registerPassword('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) =>
                      value === newPassword || 'Passwords do not match',
                  })}
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {passwordErrors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
