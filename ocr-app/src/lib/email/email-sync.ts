import { GmailClient } from '@/lib/gmail/gmail-client';
import { getSupabaseServerClient } from '@/lib/db/client';
import { queueEmailClassification } from '@/lib/queue/queues';

/**
 * Sync emails for a user
 */
export async function syncEmails(userId: string, fullSync = false): Promise<{
  synced: number;
  errors: number;
}> {
  const supabase = getSupabaseServerClient();

  try {
    // Get sync state
    const { data: syncState } = await supabase
      .from('email_sync_state')
      .select('last_history_id, last_sync_at')
      .eq('user_id', userId)
      .single();

    const gmailClient = await GmailClient.forUser(userId);

    let synced = 0;
    let errors = 0;

    if (fullSync || !syncState?.last_history_id) {
      // Full sync: fetch all recent emails
      let pageToken: string | undefined;
      const maxEmails = 500; // Limit for initial sync

      do {
        const { messages, nextPageToken } = await gmailClient.listMessages({
          maxResults: 100,
          pageToken,
          q: 'in:inbox',
        });

        if (messages.length === 0) break;

        // Fetch full message details
        const fullMessages = await gmailClient.batchGetMessages(
          messages.map((m) => m.id!).filter(Boolean)
        );

        // Save to database
        for (const message of fullMessages) {
          try {
            await saveEmail(userId, message);
            synced++;

            // Queue for classification
            const { data: savedEmail } = await supabase
              .from('email_messages')
              .select('id')
              .eq('gmail_id', message.id!)
              .eq('user_id', userId)
              .single();

            if (savedEmail) {
              await queueEmailClassification(savedEmail.id, userId);
            }
          } catch (error) {
            console.error(`Error saving email ${message.id}:`, error);
            errors++;
          }
        }

        pageToken = nextPageToken;

        if (synced >= maxEmails) break;
      } while (pageToken);

      // Get current profile for history ID
      const profile = await gmailClient.gmail.users.getProfile({
        userId: 'me',
      });

      if (profile.data.historyId) {
        await supabase
          .from('email_sync_state')
          .update({
            last_history_id: profile.data.historyId,
            last_sync_at: new Date().toISOString(),
            total_emails_synced: synced,
          })
          .eq('user_id', userId);
      }
    } else {
      // Incremental sync using history
      const { history, historyId } = await gmailClient.getHistory(
        syncState.last_history_id
      );

      for (const historyItem of history) {
        if (historyItem.messagesAdded) {
          for (const added of historyItem.messagesAdded) {
            if (!added.message?.id) continue;

            try {
              const message = await gmailClient.getMessage(added.message.id);
              await saveEmail(userId, message);
              synced++;

              // Queue for classification
              const { data: savedEmail } = await supabase
                .from('email_messages')
                .select('id')
                .eq('gmail_id', message.id!)
                .eq('user_id', userId)
                .single();

              if (savedEmail) {
                await queueEmailClassification(savedEmail.id, userId);
              }
            } catch (error) {
              console.error(`Error syncing email ${added.message.id}:`, error);
              errors++;
            }
          }
        }

        if (historyItem.messagesDeleted) {
          for (const deleted of historyItem.messagesDeleted) {
            if (!deleted.message?.id) continue;

            await supabase
              .from('email_messages')
              .delete()
              .eq('gmail_id', deleted.message.id)
              .eq('user_id', userId);
          }
        }
      }

      // Update sync state
      if (historyId) {
        await supabase
          .from('email_sync_state')
          .update({
            last_history_id: historyId,
            last_sync_at: new Date().toISOString(),
            total_emails_synced: (syncState?.total_emails_synced || 0) + synced,
          })
          .eq('user_id', userId);
      }
    }

    return { synced, errors };
  } catch (error) {
    console.error('Email sync error:', error);

    // Update sync state with error
    await supabase
      .from('email_sync_state')
      .update({
        sync_status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('user_id', userId);

    throw error;
  }
}

/**
 * Save email to database
 */
async function saveEmail(userId: string, message: any): Promise<void> {
  const supabase = getSupabaseServerClient();

  const headers = GmailClient.parseHeaders(message);
  const body = GmailClient.extractBody(message);

  await supabase.from('email_messages').upsert({
    user_id: userId,
    gmail_id: message.id,
    thread_id: message.threadId,
    subject: headers.subject,
    from_email: headers.from,
    from_name: headers.fromName,
    to_email: headers.to,
    body_plain: body.plain,
    body_html: body.html,
    snippet: message.snippet,
    has_attachments: (message.payload?.parts || []).some(
      (part: any) => part.filename && part.filename.length > 0
    ),
    is_read: !message.labelIds?.includes('UNREAD'),
    is_starred: message.labelIds?.includes('STARRED') || false,
    labels: message.labelIds || [],
    received_at: headers.date ? new Date(headers.date).toISOString() : null,
  });
}
