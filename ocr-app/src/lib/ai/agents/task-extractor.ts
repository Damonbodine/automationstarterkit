import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseServerClient } from '@/lib/db/client';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ExtractedTask {
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  due_date?: string;
}

/**
 * Extract actionable tasks from an email using Claude
 */
export async function extractTasks(emailId: string): Promise<ExtractedTask[]> {
  const supabase = getSupabaseServerClient();

  // Get email content
  const emailResult: any = await supabase
    .from('email_messages')
    .select('subject, body_plain, from_email, received_at, user_id')
    .eq('id', emailId)
    .single();

  if (emailResult.error || !emailResult.data) {
    throw new Error(`Email not found: ${emailId}`);
  }

  const email: {
    subject: string | null;
    body_plain: string | null;
    from_email: string | null;
    received_at: string | null;
    user_id: string;
  } = emailResult.data;

  const prompt = `You are an expert at extracting actionable tasks from emails. Analyze this email and identify all tasks, action items, and to-dos mentioned.

From: ${email.from_email}
Subject: ${email.subject}
Date: ${email.received_at}

Body:
${email.body_plain}

Extract ALL actionable tasks from this email. For each task, provide:
1. A clear, concise title (max 100 characters)
2. A brief description with context
3. Priority level (urgent, high, medium, low) based on:
   - Explicit deadlines or urgency words
   - Importance keywords (critical, asap, urgent)
   - Default to "medium" if unclear
4. Due date (if mentioned explicitly, in ISO format YYYY-MM-DD)

Look for:
- Explicit requests ("can you...", "please...", "need you to...")
- Deadlines ("by Friday", "before EOD", "urgent")
- Action verbs (send, prepare, review, complete, schedule)
- Implied tasks (meetings to attend, documents to review)

If no tasks are found, return an empty array.

Respond in JSON format:
{
  "tasks": [
    {
      "title": "Task title here",
      "description": "Brief description with context",
      "priority": "high",
      "due_date": "2025-01-15"
    }
  ],
  "reasoning": "Brief explanation of why these are tasks"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Extract JSON from response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  const result = JSON.parse(jsonMatch[0]);
  const tasks: ExtractedTask[] = result.tasks;

  // Save tasks to database
  if (tasks.length > 0) {
    const tasksToInsert = tasks.map((task) => ({
      user_id: email.user_id,
      email_id: emailId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      due_date: task.due_date || null,
      status: 'pending' as const,
    }));

    const { error: insertError } = await supabase
      .from('tasks')
      .insert(tasksToInsert);

    if (insertError) {
      console.error('Error saving tasks:', insertError);
      throw insertError;
    }

    // Log the agent action
    await supabase.from('agent_logs').insert({
      user_id: email.user_id,
      email_id: emailId,
      agent_type: 'task-extractor',
      action: 'extract_tasks',
      input_data: {
        subject: email.subject,
        from: email.from_email,
      },
      output_data: {
        tasks_found: tasks.length,
        tasks: tasks.map((t) => t.title),
      },
      success: true,
      execution_time_ms: null,
    });
  }

  return tasks;
}
