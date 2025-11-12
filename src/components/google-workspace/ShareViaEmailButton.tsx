'use client';

import { useState } from 'react';
import { Mail, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ShareViaEmailButtonProps {
  fileIds: string[]; // Google Drive file IDs
  fileNames?: string[]; // Optional file names for display
  defaultSubject?: string;
  defaultMessage?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export function ShareViaEmailButton({
  fileIds,
  fileNames = [],
  defaultSubject,
  defaultMessage,
  variant = 'outline',
  size = 'sm',
}: ShareViaEmailButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(
    defaultSubject || `Shared: ${fileNames[0] || 'Files'}`
  );
  const [message, setMessage] = useState(defaultMessage || '');
  const [sharePermissions, setSharePermissions] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    setError(null);

    try {
      const toArray = to.split(',').map((email) => email.trim()).filter(Boolean);

      if (toArray.length === 0) {
        throw new Error('Please enter at least one recipient');
      }

      const ccArray = cc
        ? cc.split(',').map((email) => email.trim()).filter(Boolean)
        : undefined;

      const response = await fetch('/api/google-workspace/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toArray,
          cc: ccArray,
          fileIds,
          subject,
          message,
          shareWithRecipients: sharePermissions,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to share files');
      }

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setTo('');
        setCc('');
        setMessage('');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSharing(false);
    }
  };

  if (!isOpen) {
    return (
      <Button variant={variant} size={size} onClick={() => setIsOpen(true)}>
        <Share2 className="mr-2 h-4 w-4" />
        Share via Email
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Share via Email
        </h3>

        {success ? (
          <div className="rounded-md bg-green-50 p-4 text-center dark:bg-green-900/20">
            <div className="text-sm font-medium text-green-800 dark:text-green-400">
              Email sent successfully!
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* To field */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                To *
              </label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Cc field */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Cc
              </label>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com (optional)"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Subject field */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Subject *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Message field */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message (optional)"
                rows={4}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Share permissions checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sharePermissions"
                checked={sharePermissions}
                onChange={(e) => setSharePermissions(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="sharePermissions"
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Give recipients view access to files
              </label>
            </div>

            {/* File count */}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Sharing {fileIds.length} file{fileIds.length !== 1 ? 's' : ''}
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSharing}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleShare}
                disabled={isSharing}
                className="flex-1"
              >
                <Mail className="mr-2 h-4 w-4" />
                {isSharing ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
