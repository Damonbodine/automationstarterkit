import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/db/client';
import type { Document } from '@/types/ui';
import DocumentsClient from './DocumentsClient';

async function getDocuments(userId: string) {
  const supabase = getSupabaseServerClient();

  const { data: documents, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    return [];
  }

  return documents as Document[];
}

export default async function DocumentsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const documents = await getDocuments(session.user.id);

  return <DocumentsClient initialDocuments={documents} />;
}
