import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, getErrorMessage } from '@/lib/api';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle } from 'lucide-react';

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>();

  const password = watch('password');

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link');
      setValidatingToken(false);
      return;
    }

    const validateToken = async () => {
      try {
        await api.get(`/auth/validate-reset-token/${token}`);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return;

    setError(null);
    setIsLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: data.password,
      });
      setIsSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <AuthLayout title="Validating...">
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  if (error && !isSubmitted) {
    return (
      <AuthLayout title="Invalid reset link">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          className="w-full mt-4"
          variant="outline"
          onClick={() => navigate('/forgot-password')}
        >
          Request new reset link
        </Button>
      </AuthLayout>
    );
  }

  if (isSubmitted) {
    return (
      <AuthLayout title="Password reset successful">
        <div className="space-y-4">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <p className="text-center text-muted-foreground">
            Your password has been reset successfully.
          </p>
          <Button className="w-full" onClick={() => navigate('/login')}>
            Sign in
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" description="Enter your new password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            {...register('password', {
              required: 'Password is required',
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
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) =>
                value === password || 'Passwords do not match',
            })}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Reset password
        </Button>
      </form>
    </AuthLayout>
  );
}
