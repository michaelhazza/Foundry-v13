import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/utils';
import { Search, Shield, ChevronLeft, ChevronRight } from 'lucide-react';

export function AuditLogsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string>('');
  const [search, setSearch] = useState('');
  const limit = 20;

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['audit-logs', page, action, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (action) params.append('action', action);
      if (search) params.append('search', search);
      const response = await api.get(`/audit?${params.toString()}`);
      return response.data;
    },
    enabled: user?.role === 'admin',
  });

  const logs = logsData?.data || [];
  const pagination = logsData?.meta?.pagination;

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('create') || action.includes('add')) return 'success';
    if (action.includes('delete') || action.includes('remove')) return 'destructive';
    if (action.includes('update') || action.includes('change')) return 'default';
    return 'secondary';
  };

  if (user?.role !== 'admin') {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to view audit logs.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            View a record of all actions taken in your organization.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Activity Log</span>
            </CardTitle>
            <CardDescription>
              A chronological record of all user actions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Select
                value={action}
                onValueChange={(value) => {
                  setAction(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="create_project">Create Project</SelectItem>
                  <SelectItem value="delete_project">Delete Project</SelectItem>
                  <SelectItem value="create_source">Create Source</SelectItem>
                  <SelectItem value="delete_source">Delete Source</SelectItem>
                  <SelectItem value="start_run">Start Run</SelectItem>
                  <SelectItem value="invite_user">Invite User</SelectItem>
                  <SelectItem value="remove_user">Remove User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No audit logs found.
              </p>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            {formatDateTime(log.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{log.userName || 'System'}</p>
                              <p className="text-xs text-muted-foreground">
                                {log.userEmail || '-'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getActionBadgeVariant(log.action)}>
                              {log.action.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{log.resourceType}</p>
                              {log.resourceId && (
                                <p className="text-xs text-muted-foreground">
                                  ID: {log.resourceId}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.ipAddress || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {(page - 1) * limit + 1} to{' '}
                      {Math.min(page * limit, pagination.totalCount)} of{' '}
                      {pagination.totalCount} entries
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {page} of {pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!pagination.hasNextPage}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
