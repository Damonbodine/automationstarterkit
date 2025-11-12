'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChevronDown, ChevronUp, User, Calendar, Paperclip } from 'lucide-react';

interface EmailMessage {
  id: string;
  subject: string;
  from_name: string;
  from_email: string;
  to_emails: string[];
  received_at: string;
  body_html?: string;
  body_plain?: string;
  is_read: boolean;
  has_attachments: boolean;
}

interface EmailThreadProps {
  emails: EmailMessage[];
  currentEmailId: string;
}

export default function EmailThread({ emails, currentEmailId }: EmailThreadProps) {
  // By default, only expand the most recent email
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(
    new Set([emails[emails.length - 1]?.id])
  );

  const toggleEmail = (emailId: string) => {
    setExpandedEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedEmails(new Set(emails.map(e => e.id)));
  };

  const collapseAll = () => {
    setExpandedEmails(new Set([emails[emails.length - 1]?.id]));
  };

  if (emails.length === 1) {
    // Single email, render without threading UI
    const email = emails[0];
    return (
      <Card>
        <CardHeader>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium">From:</span>
              <span>{email.from_name || email.from_email}</span>
            </div>
            {email.to_emails && email.to_emails.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-medium">To:</span>
                <span>{email.to_emails.join(', ')}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{new Date(email.received_at).toLocaleString()}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {email.body_html ? (
            <div
              className="prose max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: email.body_html }}
            />
          ) : email.body_plain ? (
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300">
              {email.body_plain}
            </pre>
          ) : (
            <p className="text-gray-500 italic">No message content</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Multiple emails in thread
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {emails.length} messages in conversation
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={expandAll}>
            Expand all
          </Button>
          <Button size="sm" variant="ghost" onClick={collapseAll}>
            Collapse all
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {emails.map((email, index) => {
          const isExpanded = expandedEmails.has(email.id);
          const isCurrent = email.id === currentEmailId;
          const isLast = index === emails.length - 1;

          return (
            <Card
              key={email.id}
              className={`transition-all ${
                isCurrent ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
              }`}
            >
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => toggleEmail(email.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {email.from_name || email.from_email}
                      </span>
                      {!email.is_read && (
                        <Badge variant="primary" className="text-xs">
                          Unread
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge variant="default" className="text-xs">
                          Current
                        </Badge>
                      )}
                      {email.has_attachments && (
                        <Paperclip className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>to {email.to_emails?.[0] || 'unknown'}</span>
                      <span>•</span>
                      <span>{new Date(email.received_at).toLocaleString()}</span>
                    </div>
                    {!isExpanded && email.body_plain && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 truncate">
                        {email.body_plain.substring(0, 100)}...
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" className="shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    {email.body_html ? (
                      <div
                        className="prose max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: email.body_html }}
                      />
                    ) : email.body_plain ? (
                      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300">
                        {email.body_plain}
                      </pre>
                    ) : (
                      <p className="text-gray-500 italic">No message content</p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
