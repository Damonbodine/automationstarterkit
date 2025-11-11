'use client';

import { useState } from 'react';
import { X, Send, Paperclip, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface GoogleDriveLink {
  fileId: string;
  fileName: string;
  fileUrl: string;
}

interface EmailComposerProps {
  onClose: () => void;
  onSent?: () => void;
  defaultTo?: string[];
  defaultSubject?: string;
  replyToEmailId?: string;
  attachedFiles?: GoogleDriveLink[];
}

export function EmailComposer({
  onClose,
  onSent,
  defaultTo = [],
  defaultSubject = '',
  replyToEmailId,
  attachedFiles = [],
}: EmailComposerProps) {
  const [to, setTo] = useState(defaultTo.join(', '));
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [googleDriveLinks, setGoogleDriveLinks] = useState<GoogleDriveLink[]>(attachedFiles);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setIsSending(true);
    setError(null);

    try {
      const toArray = to.split(',').map((email) => email.trim()).filter(Boolean);
      const ccArray = cc ? cc.split(',').map((email) => email.trim()).filter(Boolean) : undefined;

      if (toArray.length === 0) {
        throw new Error('Please enter at least one recipient');
      }

      if (!subject.trim()) {
        throw new Error('Please enter a subject');
      }

      if (!body.trim()) {
        throw new Error('Please enter a message');
      }

      const endpoint = replyToEmailId
        ? `/api/emails/${replyToEmailId}/reply`
        : '/api/emails/send';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toArray,
          cc: ccArray,
          subject,
          bodyText: body,
          googleDriveLinks: googleDriveLinks.length > 0 ? googleDriveLinks : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send email');
      }

      onSent?.();
      onClose();
    } catch (err: any) {
      setError(err.message);
      setIsSending(false);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setGoogleDriveLinks(googleDriveLinks.filter((f) => f.fileId !== fileId));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-3xl dark:border-gray-800 dark:bg-gray-950">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{replyToEmailId ? 'Reply' : 'Compose Email'}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* To field */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                To
              </label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            {/* Cc toggle */}
            {!showCc && (
              <button
                onClick={() => setShowCc(true)}
                className="text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                Add Cc
              </button>
            )}

            {/* Cc field */}
            {showCc && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cc
                </label>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            )}

            {/* Subject field */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            {/* Body field */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Message
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                rows={8}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            {/* Attached Google Drive files */}
            {googleDriveLinks.length > 0 && (
              <div className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Paperclip className="h-4 w-4" />
                  Attached Files
                </div>
                <div className="space-y-2">
                  {googleDriveLinks.map((file) => (
                    <div
                      key={file.fileId}
                      className="flex items-center justify-between rounded bg-gray-50 p-2 dark:bg-gray-800"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {file.fileName}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(file.fileId)}
                        className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between">
              <div>
                {/* Future: Add file picker button here */}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={isSending}>
                  Cancel
                </Button>
                <Button onClick={handleSend} disabled={isSending}>
                  <Send className="mr-2 h-4 w-4" />
                  {isSending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
