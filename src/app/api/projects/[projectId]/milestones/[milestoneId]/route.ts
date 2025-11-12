import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSupabaseServerClient } from '@/lib/db/client';
import type { Database } from '@/types/database';

type MilestoneUpdate = Database['public']['Tables']['milestones']['Update'];
type MilestoneStatus = Database['public']['Enums']['milestone_status'];

interface RouteParams {
  params: Promise<{
    projectId: string;
    milestoneId: string;
  }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, milestoneId } = await params;
    const body = await request.json();
    const { title, description, due_date, status } = body;

    const supabase = getSupabaseServerClient();

    // Verify the milestone belongs to the user and project
    const { data: existingMilestone, error: fetchError } = await supabase
      .from('milestones')
      .select('id')
      .eq('id', milestoneId)
      .eq('project_id', projectId)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !existingMilestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    const updateData: MilestoneUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (status !== undefined) {
      updateData.status = status as MilestoneStatus;
      // Set completed_at when status changes to completed
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (status !== 'completed') {
        updateData.completed_at = null;
      }
    }

    const { data: milestone, error } = await supabase
      .from('milestones')
      .update(updateData)
      .eq('id', milestoneId)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating milestone:', error);
      return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 });
    }

    return NextResponse.json({ milestone }, { status: 200 });
  } catch (error) {
    console.error('Error in PATCH /api/projects/[projectId]/milestones/[milestoneId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, milestoneId } = await params;
    const supabase = getSupabaseServerClient();

    // Delete the milestone (RLS will ensure user owns it)
    const { error } = await supabase
      .from('milestones')
      .delete()
      .eq('id', milestoneId)
      .eq('project_id', projectId)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error deleting milestone:', error);
      return NextResponse.json({ error: 'Failed to delete milestone' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/projects/[projectId]/milestones/[milestoneId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
