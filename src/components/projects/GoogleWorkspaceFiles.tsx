'use client';

import { ExternalLink, FolderOpen, FileSpreadsheet, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ShareViaEmailButton } from '@/components/google-workspace/ShareViaEmailButton';
import { useState } from 'react';

interface GoogleWorkspaceFilesProps {
  project: {
    id: string;
    google_folder_id?: string | null;
    google_sheet_id?: string | null;
    name: string;
  };
}

/**
 * Display Google Workspace files for a project
 */
export function GoogleWorkspaceFiles({ project }: GoogleWorkspaceFilesProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFolderOrSheet = project.google_folder_id || project.google_sheet_id;

  const handleCreateFolders = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${project.id}/create-folders`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create folders');
      }

      // Reload the page to show the new folders
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
      setIsCreating(false);
    }
  };

  if (!hasFolderOrSheet) {
    return (
      <Card className="dark:border-gray-800 dark:bg-gray-950">
        <CardHeader>
          <CardTitle>Google Workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p>No Google Drive folder or tracker sheet linked yet.</p>
            <p className="mt-2 text-xs text-gray-500">
              Create a structured folder system in Google Drive with automatic
              project tracker sheet.
            </p>

            {error && (
              <div className="mt-3 rounded-md bg-red-50 p-3 text-xs text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <Button
              onClick={handleCreateFolders}
              disabled={isCreating}
              className="mt-4"
              size="sm"
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              {isCreating ? 'Creating...' : 'Create Project Folders'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:border-gray-800 dark:bg-gray-950">
      <CardHeader>
        <CardTitle>Google Workspace</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {project.google_folder_id && (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-blue-100 p-2 dark:bg-blue-900/20">
                  <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Project Folder
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Google Drive
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={`https://drive.google.com/drive/folders/${project.google_folder_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  Open
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          )}

          {project.google_sheet_id && (
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-green-100 p-2 dark:bg-green-900/20">
                    <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Project Tracker
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Google Sheets
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${project.google_sheet_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      Open
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <ShareViaEmailButton
                    fileIds={[project.google_sheet_id]}
                    fileNames={[`${project.name} - Tracker`]}
                    defaultSubject={`Project Tracker: ${project.name}`}
                    defaultMessage={`Here's the project tracker for ${project.name}.`}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/10">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-white">
                Project Structure:
              </strong>{' '}
              The project folder contains subfolders for Documents,
              Spreadsheets, Presentations, Assets, Deliverables, and Contracts.
              All project-related files are automatically organized here.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
