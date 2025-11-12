import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Mail, AlertCircle, CheckSquare, FileText } from 'lucide-react';

export interface QuickStatsProps {
  unreadCount: number;
  urgentCount: number;
  tasksCount: number;
  documentsCount: number;
}

export default function QuickStats({ unreadCount, urgentCount, tasksCount, documentsCount }: QuickStatsProps) {
  return (
    <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Unread Emails</CardTitle>
          <Mail className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="unread-count">{unreadCount}</div>
          <p className="text-xs text-gray-500 mt-1">From your inbox</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Priority Actions</CardTitle>
          <AlertCircle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="priority-count">{urgentCount}</div>
          <p className="text-xs text-gray-500 mt-1">Urgent & high priority</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
          <CheckSquare className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="pending-tasks">{tasksCount}</div>
          <p className="text-xs text-gray-500 mt-1">Extracted from emails</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Documents</CardTitle>
          <FileText className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="documents-count">{documentsCount}</div>
          <p className="text-xs text-gray-500 mt-1">OCR processed</p>
        </CardContent>
      </Card>
    </div>
  );
}

