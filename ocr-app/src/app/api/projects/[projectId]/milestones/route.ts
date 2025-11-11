import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getSupabaseServerClient } from '@/lib/db/client';
import type { Database } from '@/types/database';

type MilestoneInsert = Database['public']['Tables']['milestones']['Insert'];
type MilestoneStatus = Database['public']['Enums']['milestone_status'];

interface RouteParams {
  params: Promise<{
    projectId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await request.json();
    const { title, description, due_date } = body;

    if (!title || !due_date) {
      return NextResponse.json({ error: 'Title and due_date are required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Verify the project belongs to the user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', session.user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const milestoneData: MilestoneInsert = {
      user_id: session.user.id,
      project_id: projectId,
      title,
      description: description || null,
      due_date,
      status: 'pending',
    };

    const { data: milestone, error } = await supabase
      .from('milestones')
      .insert(milestoneData)
      .select()
      .single();

    if (error) {
      console.error('Error creating milestone:', error);
      return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 });
    }

    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/projects/[projectId]/milestones:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const supabase = getSupabaseServerClient();

    // Verify the project belongs to the user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', session.user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: milestones, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', session.user.id)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching milestones:', error);
      return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 });
    }

    return NextResponse.json({ milestones }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/projects/[projectId]/milestones:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
