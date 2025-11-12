// Lightweight orchestration hooks for starter-pack customizations.
// Default implementations are no-ops; projects can override by module aliasing.

export interface ClassificationResult {
  category: string;
  priority: string;
  sentiment: string;
  tags?: string[];
  assigned_agents?: string[];
  confidence_score?: number;
}

function debugLog(event: string, payload: any) {
  if (process.env.ORCHESTRATION_DEBUG === '1') {
    // eslint-disable-next-line no-console
    console.log(`[orchestration] ${event}`, JSON.stringify(payload));
  }
}

export const orchestrationHooks = {
  async onEmailSaved(args: { userId: string; emailId: string; subject?: string | null }) {
    debugLog('onEmailSaved', args);
  },

  async onEmailClassified(args: { userId: string; emailId: string; classification: ClassificationResult }) {
    debugLog('onEmailClassified', args);
  },

  async onDocumentCreated(args: {
    userId: string;
    emailId: string | null;
    documentId?: string;
    filename: string;
    mimeType: string;
    gcsUrl: string;
    ocrText?: string | null;
  }) {
    debugLog('onDocumentCreated', { ...args, ocrText: args.ocrText ? `len=${args.ocrText.length}` : null });
  },
};

