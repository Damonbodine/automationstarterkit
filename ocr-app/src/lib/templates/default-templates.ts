import { Template, SOW_VARIABLES, PROJECT_TRACKER_VARIABLES } from './template-types';

/**
 * Default SOW Template
 */
export const DEFAULT_SOW_TEMPLATE: Omit<Template, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Default Statement of Work',
  type: 'sow',
  description: 'Standard SOW template with all essential sections',
  isDefault: true,
  variables: SOW_VARIABLES,
  content: `# {title}

**Client:** {client_name}
**Date:** {generated_date}
{client_email ? \`**Contact:** {client_email}\` : ''}

---

## Executive Summary

{project_overview}

---

## Scope of Work

{scope}

### Inclusions
- Services and deliverables included in this engagement

### Exclusions
- Items explicitly not included in scope

---

## Deliverables

{deliverables}

---

## Timeline & Milestones

{timeline || 'Timeline to be determined'}

{milestones ? \`### Key Milestones\n\n{milestones}\` : ''}

---

## Budget & Payment Terms

{budget || 'To be discussed'}

---

## Assumptions & Constraints

{assumptions || \`
- Client will provide timely feedback and approvals
- All necessary resources and access will be provided
- Changes to scope may affect timeline and budget
\`}

---

## Acceptance Criteria

{acceptance_criteria || \`
- All deliverables completed as specified
- Client sign-off obtained
- Documentation provided
\`}

---

## Terms & Conditions

This Statement of Work is subject to the terms outlined in the Master Services Agreement.

---

*Generated on {generated_date}*
`,
};

/**
 * Simplified SOW Template
 */
export const SIMPLE_SOW_TEMPLATE: Omit<Template, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Simple Statement of Work',
  type: 'sow',
  description: 'Minimal SOW template for quick engagements',
  isDefault: false,
  variables: SOW_VARIABLES.filter(v => v.required || ['timeline', 'budget'].includes(v.name)),
  content: `# {title}

**Client:** {client_name}
**Date:** {generated_date}

## Overview
{project_overview}

## Scope
{scope}

## Deliverables
{deliverables}

## Timeline
{timeline || 'TBD'}

## Budget
{budget || 'TBD'}

---
*Generated with AI Assistant*
`,
};

/**
 * Default Project Tracker Sheet Template
 * This defines the structure for a Google Sheet
 */
export const DEFAULT_PROJECT_TRACKER_TEMPLATE: Omit<Template, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Default Project Tracker',
  type: 'project_tracker',
  description: 'Standard project tracking spreadsheet',
  isDefault: true,
  variables: PROJECT_TRACKER_VARIABLES,
  content: JSON.stringify({
    sheets: [
      {
        name: 'Overview',
        headers: [
          'Project Name',
          'Client',
          'Start Date',
          'End Date',
          'Status',
          'Budget',
          'Spent',
          'Health',
        ],
        initialData: [
          [
            '{project_name}',
            '{client_name}',
            '{start_date}',
            '{end_date}',
            '{status}',
            '{budget}',
            '0',
            'Green',
          ],
        ],
      },
      {
        name: 'Tasks',
        headers: [
          'Task ID',
          'Description',
          'Priority',
          'Status',
          'Due Date',
          'Assigned To',
          'Completed Date',
          'Notes',
        ],
        initialData: [],
      },
      {
        name: 'Updates',
        headers: [
          'Date',
          'Milestone',
          'Status',
          'Progress %',
          'Notes',
          'Updated By',
        ],
        initialData: [],
      },
      {
        name: 'Documents',
        headers: [
          'Document Name',
          'Type',
          'Link',
          'Created Date',
          'Notes',
        ],
        initialData: [],
      },
    ],
  }),
};

/**
 * All default templates
 */
export const DEFAULT_TEMPLATES = [
  DEFAULT_SOW_TEMPLATE,
  SIMPLE_SOW_TEMPLATE,
  DEFAULT_PROJECT_TRACKER_TEMPLATE,
];
