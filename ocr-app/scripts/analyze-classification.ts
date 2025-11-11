/**
 * Classification Performance Analysis Script
 *
 * This script analyzes how well the email classification system is performing:
 * - Category distribution
 * - Confidence score analysis
 * - Agent assignment patterns
 * - Priority and sentiment distribution
 * - User feedback/corrections
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

type EmailCategory = Database['public']['Enums']['email_category'];
type PriorityLevel = Database['public']['Enums']['priority_level'];
type SentimentType = Database['public']['Enums']['sentiment_type'];

interface AnalysisResults {
  totalEmails: number;
  classifiedEmails: number;
  classificationRate: number;
  categoryDistribution: Record<EmailCategory, number>;
  confidenceStats: {
    avg: number;
    min: number;
    max: number;
    median: number;
  };
  priorityDistribution: Record<PriorityLevel, number>;
  sentimentDistribution: Record<SentimentType, number>;
  agentAssignments: Record<string, number>;
  userCorrections: number;
  correctionRate: number;
  lowConfidenceClassifications: number;
  patternMatchedVsAI: {
    pattern: number;
    ai: number;
  };
}

async function analyzeClassifications(): Promise<AnalysisResults> {
  console.log('📊 Starting classification analysis...\n');

  // Get total emails
  const { count: totalEmails } = await supabase
    .from('email_messages')
    .select('*', { count: 'exact', head: true });

  // Get all classifications
  const { data: classifications, count: classifiedCount } = await supabase
    .from('email_classifications')
    .select('*', { count: 'exact' });

  if (!classifications || classifications.length === 0) {
    console.log('⚠️  No classifications found in database');
    console.log(`Total emails: ${totalEmails || 0}`);
    console.log('Run some email classifications first!\n');
    process.exit(0);
  }

  const classifiedEmails = classifiedCount || 0;
  const classificationRate = totalEmails ? (classifiedEmails / totalEmails) * 100 : 0;

  // Initialize counters
  const categoryDistribution: Record<string, number> = {};
  const priorityDistribution: Record<string, number> = {};
  const sentimentDistribution: Record<string, number> = {};
  const agentAssignments: Record<string, number> = {};

  const confidenceScores: number[] = [];
  let userCorrections = 0;
  let lowConfidenceCount = 0;
  let patternMatched = 0;
  let aiClassified = 0;

  // Analyze each classification
  for (const cls of classifications) {
    // Category
    if (cls.category) {
      categoryDistribution[cls.category] = (categoryDistribution[cls.category] || 0) + 1;
    }

    // Priority
    if (cls.priority) {
      priorityDistribution[cls.priority] = (priorityDistribution[cls.priority] || 0) + 1;
    }

    // Sentiment
    if (cls.sentiment) {
      sentimentDistribution[cls.sentiment] = (sentimentDistribution[cls.sentiment] || 0) + 1;
    }

    // Confidence
    if (cls.confidence_score !== null) {
      confidenceScores.push(cls.confidence_score);

      // Pattern-based classifications typically have 0.85 confidence
      // AI classifications have variable confidence
      if (cls.confidence_score === 0.85) {
        patternMatched++;
      } else if (cls.confidence_score === 0.5) {
        // Fallback classification
        aiClassified++;
      } else if (cls.confidence_score > 0.85) {
        aiClassified++;
      }

      if (cls.confidence_score < 0.7) {
        lowConfidenceCount++;
      }
    }

    // Agent assignments
    if (cls.assigned_agents) {
      for (const agent of cls.assigned_agents) {
        agentAssignments[agent] = (agentAssignments[agent] || 0) + 1;
      }
    }

    // User corrections
    if (cls.user_feedback) {
      userCorrections++;
    }
  }

  // Calculate confidence stats
  confidenceScores.sort((a, b) => a - b);
  const confidenceStats = {
    avg: confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length,
    min: confidenceScores[0] || 0,
    max: confidenceScores[confidenceScores.length - 1] || 0,
    median: confidenceScores[Math.floor(confidenceScores.length / 2)] || 0,
  };

  const correctionRate = classifiedEmails > 0 ? (userCorrections / classifiedEmails) * 100 : 0;

  return {
    totalEmails: totalEmails || 0,
    classifiedEmails,
    classificationRate,
    categoryDistribution: categoryDistribution as Record<EmailCategory, number>,
    confidenceStats,
    priorityDistribution: priorityDistribution as Record<PriorityLevel, number>,
    sentimentDistribution: sentimentDistribution as Record<SentimentType, number>,
    agentAssignments,
    userCorrections,
    correctionRate,
    lowConfidenceClassifications: lowConfidenceCount,
    patternMatchedVsAI: {
      pattern: patternMatched,
      ai: aiClassified,
    },
  };
}

function printResults(results: AnalysisResults) {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📧 EMAIL CLASSIFICATION PERFORMANCE REPORT');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📊 OVERALL STATISTICS');
  console.log('─────────────────────────────────────────────────────');
  console.log(`Total Emails: ${results.totalEmails}`);
  console.log(`Classified Emails: ${results.classifiedEmails}`);
  console.log(`Classification Rate: ${results.classificationRate.toFixed(1)}%`);
  console.log(`User Corrections: ${results.userCorrections} (${results.correctionRate.toFixed(1)}%)`);
  console.log(`Low Confidence (<0.7): ${results.lowConfidenceClassifications}\n`);

  console.log('🎯 CLASSIFICATION METHOD');
  console.log('─────────────────────────────────────────────────────');
  console.log(`Pattern-based: ${results.patternMatchedVsAI.pattern}`);
  console.log(`AI-based: ${results.patternMatchedVsAI.ai}\n`);

  console.log('📂 CATEGORY DISTRIBUTION');
  console.log('─────────────────────────────────────────────────────');
  const sortedCategories = Object.entries(results.categoryDistribution)
    .sort(([, a], [, b]) => b - a);
  for (const [category, count] of sortedCategories) {
    const percentage = ((count / results.classifiedEmails) * 100).toFixed(1);
    console.log(`${category.padEnd(20)} ${count.toString().padStart(4)} (${percentage}%)`);
  }
  console.log();

  console.log('📊 CONFIDENCE SCORES');
  console.log('─────────────────────────────────────────────────────');
  console.log(`Average: ${results.confidenceStats.avg.toFixed(3)}`);
  console.log(`Median:  ${results.confidenceStats.median.toFixed(3)}`);
  console.log(`Min:     ${results.confidenceStats.min.toFixed(3)}`);
  console.log(`Max:     ${results.confidenceStats.max.toFixed(3)}\n`);

  console.log('⚡ PRIORITY DISTRIBUTION');
  console.log('─────────────────────────────────────────────────────');
  const sortedPriorities = Object.entries(results.priorityDistribution)
    .sort(([, a], [, b]) => b - a);
  for (const [priority, count] of sortedPriorities) {
    const percentage = ((count / results.classifiedEmails) * 100).toFixed(1);
    console.log(`${priority.padEnd(20)} ${count.toString().padStart(4)} (${percentage}%)`);
  }
  console.log();

  console.log('😊 SENTIMENT DISTRIBUTION');
  console.log('─────────────────────────────────────────────────────');
  const sortedSentiments = Object.entries(results.sentimentDistribution)
    .sort(([, a], [, b]) => b - a);
  for (const [sentiment, count] of sortedSentiments) {
    const percentage = ((count / results.classifiedEmails) * 100).toFixed(1);
    console.log(`${sentiment.padEnd(20)} ${count.toString().padStart(4)} (${percentage}%)`);
  }
  console.log();

  if (Object.keys(results.agentAssignments).length > 0) {
    console.log('🤖 AGENT ASSIGNMENTS');
    console.log('─────────────────────────────────────────────────────');
    const sortedAgents = Object.entries(results.agentAssignments)
      .sort(([, a], [, b]) => b - a);
    for (const [agent, count] of sortedAgents) {
      console.log(`${agent.padEnd(25)} ${count.toString().padStart(4)}`);
    }
    console.log();
  }

  console.log('═══════════════════════════════════════════════════════\n');
}

async function getRecentClassificationExamples(limit = 10) {
  console.log(`📝 Recent Classifications (last ${limit}):\n`);

  const { data: recent } = await supabase
    .from('email_classifications')
    .select(`
      *,
      email_messages (
        subject,
        from_email,
        received_at
      )
    `)
    .order('classified_at', { ascending: false })
    .limit(limit);

  if (!recent || recent.length === 0) {
    console.log('No recent classifications found\n');
    return;
  }

  for (const cls of recent) {
    const email = cls.email_messages as any;
    console.log('─────────────────────────────────────────────────────');
    console.log(`Subject: ${email?.subject || 'N/A'}`);
    console.log(`From: ${email?.from_email || 'N/A'}`);
    console.log(`Category: ${cls.category || 'N/A'}`);
    console.log(`Priority: ${cls.priority || 'N/A'}`);
    console.log(`Sentiment: ${cls.sentiment || 'N/A'}`);
    console.log(`Confidence: ${cls.confidence_score?.toFixed(3) || 'N/A'}`);
    if (cls.assigned_agents && cls.assigned_agents.length > 0) {
      console.log(`Agents: ${cls.assigned_agents.join(', ')}`);
    }
    if (cls.tags && cls.tags.length > 0) {
      console.log(`Tags: ${cls.tags.join(', ')}`);
    }
    if (cls.user_feedback) {
      console.log(`⚠️  User Feedback: ${cls.user_feedback}`);
    }
    console.log();
  }
}

async function main() {
  try {
    const results = await analyzeClassifications();
    printResults(results);
    await getRecentClassificationExamples(10);

    // Recommendations
    console.log('💡 RECOMMENDATIONS');
    console.log('═══════════════════════════════════════════════════════');

    if (results.lowConfidenceClassifications > results.classifiedEmails * 0.2) {
      console.log('⚠️  High number of low-confidence classifications');
      console.log('   Consider improving the classifier prompt or adding more patterns\n');
    }

    if (results.correctionRate > 10) {
      console.log('⚠️  High correction rate (>10%)');
      console.log('   Review user feedback to improve classification accuracy\n');
    }

    const generalCount = results.categoryDistribution['general'] || 0;
    if (generalCount > results.classifiedEmails * 0.4) {
      console.log('⚠️  Many emails classified as "general" (>40%)');
      console.log('   Consider adding more specific categories or patterns\n');
    }

    const otherCount = results.categoryDistribution['other'] || 0;
    if (otherCount > results.classifiedEmails * 0.2) {
      console.log('⚠️  Many emails classified as "other" (>20%)');
      console.log('   Review these emails to identify missing categories\n');
    }

    if (results.patternMatchedVsAI.pattern < results.classifiedEmails * 0.3) {
      console.log('💡 Low pattern-matching rate (<30%)');
      console.log('   Consider adding more patterns to reduce AI classification costs\n');
    }

    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

main();
