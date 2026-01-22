import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useToast } from '@/hooks/use-toast';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import {
  ArrowLeft,
  Download,
  Database,
  FileText,
  Loader2,
  Eye,
} from 'lucide-react';

export function DatasetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = useState('jsonl');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: dataset, isLoading } = useQuery({
    queryKey: ['dataset', id],
    queryFn: async () => {
      const response = await api.get(`/datasets/${id}`);
      return response.data.data;
    },
  });

  const { data: previewData, isLoading: previewLoading } = useQuery({
    queryKey: ['dataset-preview', id, page],
    queryFn: async () => {
      const response = await api.get(`/datasets/${id}/preview?page=${page}&limit=${limit}`);
      return response.data;
    },
    enabled: !!dataset,
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get(`/datasets/${id}/download?format=${exportFormat}`, {
        responseType: 'blob',
      });
      return response.data;
    },
    onSuccess: (data) => {
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dataset-${id}.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: 'Download started',
        description: 'Your dataset is being downloaded.',
      });
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: getErrorMessage(err),
      });
    },
  });

  const preview = previewData?.data || [];
  const pagination = previewData?.meta?.pagination;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!dataset) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-2xl font-bold mb-4">Dataset not found</h2>
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
                to={`/projects/${dataset.projectId}`}
                className="text-muted-foreground hover:text-foreground"
              >
                Project
              </Link>
              <span className="text-muted-foreground">/</span>
              <span>Dataset</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{dataset.name}</h1>
            <p className="text-muted-foreground">
              Generated {formatRelativeTime(dataset.createdAt)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jsonl">JSONL</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="parquet">Parquet</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => downloadMutation.mutate()}
              disabled={downloadMutation.isPending}
            >
              {downloadMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dataset.recordCount?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">File Size</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatFileSize(dataset.sizeBytes || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Format</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold uppercase">
                {dataset.format || 'JSONL'}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Data Preview</span>
                </CardTitle>
                <CardDescription>
                  Preview of the first records in the dataset.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {previewLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : preview.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No records available for preview.
              </p>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((record: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-muted-foreground">
                            {(page - 1) * limit + index + 1}
                          </TableCell>
                          <TableCell>
                            <pre className="text-xs overflow-auto max-w-xl">
                              {JSON.stringify(record, null, 2)}
                            </pre>
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
                      {pagination.totalCount} records
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!pagination.hasNextPage}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {dataset.schema && (
          <Card>
            <CardHeader>
              <CardTitle>Schema</CardTitle>
              <CardDescription>
                The schema of records in this dataset.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(dataset.schema, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
