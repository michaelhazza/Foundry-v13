import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { datasets, processingRuns, projects } from '../db/schema.js';
import { NotFoundError } from '../errors/index.js';

/**
 * Verify dataset exists and belongs to organization via project
 */
async function verifyDataset(datasetId: number, organizationId: number) {
  const dataset = await db.query.datasets.findFirst({
    where: eq(datasets.id, datasetId),
    with: {
      run: {
        with: {
          project: true,
        },
      },
    },
  });

  if (!dataset || dataset.run.project.organizationId !== organizationId) {
    throw new NotFoundError('Dataset');
  }

  return dataset;
}

/**
 * Get dataset details
 */
export async function getDataset(datasetId: number, organizationId: number) {
  const dataset = await verifyDataset(datasetId, organizationId);

  return {
    id: dataset.id,
    name: dataset.name,
    format: dataset.format,
    recordCount: dataset.recordCount,
    fileSize: dataset.fileSize,
    stats: dataset.stats,
    runId: dataset.runId,
    createdAt: dataset.createdAt,
  };
}

/**
 * Get dataset preview
 */
export async function getDatasetPreview(datasetId: number, organizationId: number) {
  await verifyDataset(datasetId, organizationId);

  // Simulated preview data
  return {
    format: 'conversational',
    sample: [
      {
        id: 1,
        messages: [
          { role: 'user', content: 'Hello, I need help with my order.' },
          { role: 'assistant', content: 'Hi! I\'d be happy to help. What\'s your order number?' },
          { role: 'user', content: 'It\'s #12345' },
          { role: 'assistant', content: 'I found your order. How can I assist you today?' },
        ],
        metadata: { source: 'support_tickets', category: 'orders' },
      },
      {
        id: 2,
        messages: [
          { role: 'user', content: 'How do I reset my password?' },
          { role: 'assistant', content: 'You can reset your password by clicking "Forgot Password" on the login page.' },
        ],
        metadata: { source: 'support_tickets', category: 'account' },
      },
    ],
    totalRecords: 100,
  };
}

/**
 * Export dataset (conversational format)
 */
export async function exportDataset(
  datasetId: number,
  organizationId: number,
  format: 'conversational' | 'qa' | 'json' = 'conversational'
) {
  await verifyDataset(datasetId, organizationId);

  // In a real app, this would generate a download URL or stream the file
  // For now, return sample data based on format

  if (format === 'conversational') {
    return {
      format: 'jsonl',
      contentType: 'application/x-ndjson',
      filename: `dataset-${datasetId}-conversational.jsonl`,
      sample: `{"messages":[{"role":"user","content":"Hello"},{"role":"assistant","content":"Hi there!"}]}\n{"messages":[{"role":"user","content":"Help me"},{"role":"assistant","content":"Sure!"}]}`,
    };
  }

  if (format === 'qa') {
    return {
      format: 'jsonl',
      contentType: 'application/x-ndjson',
      filename: `dataset-${datasetId}-qa.jsonl`,
      sample: `{"question":"How do I reset my password?","answer":"Click Forgot Password on the login page."}\n{"question":"What is the return policy?","answer":"You can return items within 30 days."}`,
    };
  }

  // json format
  return {
    format: 'json',
    contentType: 'application/json',
    filename: `dataset-${datasetId}.json`,
    sample: JSON.stringify([
      { id: 1, content: 'Hello', metadata: {} },
      { id: 2, content: 'Hi there', metadata: {} },
    ]),
  };
}

/**
 * Get dataset statistics
 */
export async function getDatasetStats(datasetId: number, organizationId: number) {
  const dataset = await verifyDataset(datasetId, organizationId);

  return {
    totalRecords: dataset.recordCount || 0,
    totalConversations: dataset.stats?.totalConversations || 0,
    avgConversationLength: dataset.stats?.avgConversationLength || 0,
    uniqueSpeakers: dataset.stats?.uniqueSpeakers || 0,
    piiDetected: 15,
    piiMasked: 15,
    qualityScore: 0.92,
  };
}
