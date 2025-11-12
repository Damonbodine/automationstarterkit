import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSupabaseServerClient } from '@/lib/db/client';
import { SheetsClient } from '@/lib/google/sheets-client';

/**
 * Extract a document's OCR text to a Google Sheet.
 * This is a scaffold: it expects that the document is linked to a project
 * that has a google_sheet_id. If not linked yet, it returns 409.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await ctx.params;
    const supabase = getSupabaseServerClient();

    // Load document and associated email/project (if any)
    type DocumentRow = {
      id: string;
      user_id: string;
      email_id: string | null;
      filename: string;
      ocr_text: string | null;
    };

    const { data: doc, error: docErr } = (await supabase
      .from('documents')
      .select('id, user_id, email_id, filename, ocr_text')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single()) as { data: DocumentRow | null; error: any };

    if (docErr || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const document = doc;

    // Try to infer project from email linkage if available
    let projectSheetId: string | null = null;
    if (document.email_id) {
      type ProjectRow = { google_sheet_id: string | null };
      const { data: project } = (await supabase
        .from('projects')
        .select('google_sheet_id')
        .eq('user_id', session.user.id)
        // In a later phase, link email->project; for now this is a fallback
        .limit(1)
        .maybeSingle()) as { data: ProjectRow | null; error: any };

      projectSheetId = project?.google_sheet_id || null;
    }

    if (!projectSheetId) {
      return NextResponse.json(
        {
          error: 'No linked project sheet',
          message: 'Project linkage and google_sheet_id required (Phase 6).',
        },
        { status: 409 }
      );
    }

    if (!document.ocr_text || document.ocr_text.trim().length === 0) {
      return NextResponse.json({ error: 'No OCR text found for document' }, { status: 400 });
    }

    const sheets = await SheetsClient.forUser(session.user.id);
    const sheetName = 'Extracted';

    // Basic append of filename, timestamp, and a preview of text
    const preview = document.ocr_text.length > 500 ? document.ocr_text.slice(0, 500) + '…' : document.ocr_text;
    await sheets.appendRow(projectSheetId, sheetName, [
      new Date().toISOString(),
      document.filename,
      preview,
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

