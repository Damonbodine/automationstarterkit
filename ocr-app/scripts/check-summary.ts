#!/usr/bin/env tsx
/**
 * Check if email summary exists in database
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const emailId = process.argv[2] || 'd5745c74-4277-48d9-a2a4-7426c7575837';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkSummary() {
  const { data, error } = await supabase
    .from('email_messages')
    .select('id, subject, ai_summary')
    .eq('id', emailId)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Email:', data?.subject);
  console.log('Has summary:', !!data?.ai_summary);
  console.log('Summary:', JSON.stringify(data?.ai_summary, null, 2));
}

checkSummary();
