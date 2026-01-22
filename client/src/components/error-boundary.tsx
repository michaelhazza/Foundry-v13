import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught error:', {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-destructive">Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Please try refreshing the page.
              </CardDescription>
            </CardHeader>

            {import.meta.env.DEV && this.state.error && (
              <CardContent>
                <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                  <p className="text-xs font-mono text-destructive">
                    {this.state.error.message}
                  </p>
                </div>
              </CardContent>
            )}

            <CardFooter className="flex gap-2">
              <Button onClick={this.handleReset} className="flex-1">
                Go to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                Refresh Page
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
