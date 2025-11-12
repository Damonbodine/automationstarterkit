'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import {
  FileText,
  Upload,
  Download,
  Eye,
  Check,
  Clock,
  XCircle,
  File,
  RefreshCw,
} from 'lucide-react';
import { Document as DocumentType } from '@/types/ui';
import { GoogleDriveLogo } from '@/components/ui/icons'; // Assuming you have a Google Drive icon component

export default function DocumentsClient({ initialDocuments }: { initialDocuments: DocumentType[] }) {
  const [documents, setDocuments] = useState<DocumentType[]>(initialDocuments);
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/documents/sync/google-drive', {
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Sync failed');
      }
      alert(result.message);
      router.refresh(); // Refresh the page to get the new documents
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Documents</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {documents.length} document{documents.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <Button onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GoogleDriveLogo className="mr-2 h-4 w-4" />
            )}
            {isSyncing ? 'Syncing...' : 'Sync with Google Drive'}
          </Button>
        </div>

        {/* Upload Section */}
        <Card className="mb-8 dark:border-gray-800 dark:bg-gray-950">
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>
              Upload images or PDFs for OCR text extraction
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/documents/upload" method="POST" encType="multipart/form-data">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors dark:border-gray-700 dark:hover:border-gray-600">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4" />
                  Choose File
                </label>
                <input
                  id="file-upload"
                  name="file"
                  type="file"
                  className="sr-only"
                  accept="image/png,image/jpeg,application/pdf"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, or PDF up to 10MB
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Documents Grid */}
        {documents.length === 0 ? (
          <Card className="dark:border-gray-800 dark:bg-gray-950">
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No documents yet</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Upload a document or sync with Google Drive to get started.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => {
              const isOcrProcessed = doc.source_type === 'upload' && doc.ocr_completed_at !== null;
              const isGdriveDoc = doc.source_type === 'google_drive';
              const isPdf = doc.file_type?.includes('pdf');

              const getStatus = () => {
                if (doc.source_type === 'upload') {
                  if (doc.ocr_completed_at) return <Badge variant="success"><Check className="h-3 w-3 mr-1" />Processed</Badge>;
                  if (doc.ocr_text === null) return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
                  return <Badge variant="danger"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
                }
                if (isGdriveDoc) {
                  return <Badge variant="info">Google Drive</Badge>;
                }
                return null;
              };

              return (
                <Card key={doc.id} className="hover:shadow-md transition-shadow dark:border-gray-800 dark:bg-gray-950">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {isGdriveDoc ? <GoogleDriveLogo className="h-5 w-5 flex-shrink-0" /> : isPdf ? <File className="h-5 w-5 text-red-500 flex-shrink-0" /> : <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />}
                          <CardTitle className="text-base truncate">
                            {doc.filename}
                          </CardTitle>
                        </div>
                        <CardDescription className="text-xs">
                          {doc.file_type || 'Unknown type'}
                          {doc.file_size_bytes && (
                            <> • {(doc.file_size_bytes / 1024).toFixed(0)} KB</>
                          )}
                        </CardDescription>
                      </div>
                      {getStatus()}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Content Preview */}
                    {doc.content && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                          Extracted Text Preview:
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3">
                          {doc.content}
                        </p>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <p>Added: {formatDate(doc.created_at || '')}</p>
                      {doc.ocr_completed_at && (
                        <p>Processed: {formatDate(doc.ocr_completed_at)}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {doc.gcs_url && (
                        <Button size="sm" variant="outline" className="flex-1" asChild>
                          <a href={doc.gcs_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </a>
                        </Button>
                      )}
                      {doc.webviewlink && (
                         <Button size="sm" variant="outline" className="flex-1" asChild>
                         <a href={doc.webviewlink} target="_blank" rel="noopener noreferrer">
                           <Eye className="h-3 w-3 mr-1" />
                           View on Drive
                         </a>
                       </Button>
                      )}
                      {doc.content && !doc.webviewlink && (
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      )}
                    </div>

                    {isOcrProcessed && (
                      <form action={`/api/documents/${doc.id}/extract-to-sheet`} method="POST">
                        <Button size="sm" variant="default" className="w-full" type="submit">
                          Export to Google Sheets
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
