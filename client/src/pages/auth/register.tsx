import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { api, getErrorMessage } from '@/lib/api';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface InvitationInfo {
  email: string;
  organizationName: string;
}

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [validatingToken, setValidatingToken] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch('password');

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setValidatingToken(false);
      return;
    }

    const validateToken = async () => {
      try {
        const response = await api.get(`/invitations/validate/${token}`);
        setInvitation(response.data.data);
        setValue('email', response.data.data.email);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token, setValue]);

  const onSubmit = async (data: RegisterForm) => {
    if (!token) return;

    setError(null);
    setIsLoading(true);

    try {
      await registerUser({
        invitationToken: token,
        email: data.email,
        password: data.password,
        name: data.name,
      });
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <AuthLayout title="Validating invitation...">
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  if (error && !invitation) {
    return (
      <AuthLayout title="Invalid invitation">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          className="w-full mt-4"
          variant="outline"
          onClick={() => navigate('/login')}
        >
          Go to Login
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      description={`Join ${invitation?.organizationName}`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            {...register('name', {
              required: 'Name is required',
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
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            disabled
            {...register('email')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
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
          <Label htmlFor="confirmPassword">Confirm Password</Label>
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
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
