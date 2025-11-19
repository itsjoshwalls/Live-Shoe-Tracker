import { BigQuery } from "@google-cloud/bigquery";
import * as functions from "firebase-functions";

let bq;

function getBigQuery() {
  if (!bq) {
    bq = new BigQuery();
  }
  return bq;
}

// Table schemas for analytics events
export function getReleaseEventSchema() {
  return [
    { name: "ts", type: "TIMESTAMP", mode: "NULLABLE" },
    { name: "releaseId", type: "STRING", mode: "NULLABLE" },
    { name: "productId", type: "STRING", mode: "NULLABLE" },
    { name: "retailerId", type: "STRING", mode: "NULLABLE" },
    { name: "statusBefore", type: "STRING", mode: "NULLABLE" },
    { name: "statusAfter", type: "STRING", mode: "NULLABLE" },
    { name: "price", type: "NUMERIC", mode: "NULLABLE" },
  ];
}

export function getQueueEventSchema() {
  return [
    { name: "ts", type: "TIMESTAMP", mode: "NULLABLE" },
    { name: "jobId", type: "STRING", mode: "NULLABLE" },
    { name: "target", type: "STRING", mode: "NULLABLE" },
    { name: "status", type: "STRING", mode: "NULLABLE" },
    { name: "durationMs", type: "INTEGER", mode: "NULLABLE" },
    { name: "error", type: "STRING", mode: "NULLABLE" },
  ];
}

async function ensureDataset(client, datasetId) {
  const dataset = client.dataset(datasetId);
  const [exists] = await dataset.exists();
  if (!exists) {
    await dataset.create();
    functions.logger.info(`Created BigQuery dataset ${datasetId}`);
  }
  return dataset;
}

async function ensureTable(dataset, tableId, schema) {
  const table = dataset.table(tableId);
  const [exists] = await table.exists();
  if (!exists) {
    await table.create({ schema: { fields: schema } });
    functions.logger.info(`Created BigQuery table ${tableId} with schema`);
  } else {
    // If table exists but has no schema, set it
    const [metadata] = await table.getMetadata();
    if (!metadata.schema || !metadata.schema.fields || metadata.schema.fields.length === 0) {
      await table.setMetadata({ schema: { fields: schema } });
      functions.logger.info(`Applied schema to existing BigQuery table ${tableId}`);
    }
  }
  return table;
}

export async function insertRows(datasetId, tableId, rows, schema) {
  try {
    const client = getBigQuery();
    const dataset = await ensureDataset(client, datasetId);
    const table = await ensureTable(dataset, tableId, schema || []);

    if (!Array.isArray(rows)) rows = [rows];

    try {
      const [insertErrors] = await table.insert(rows);
      if (insertErrors && insertErrors.length) {
        functions.logger.error("BigQuery insert errors", insertErrors);
        return { success: false, errors: insertErrors };
      }
      return { success: true };
    } catch (err) {
      // Retry once if schema missing
      const msg = err?.message || "";
      if (msg.includes("no schema")) {
        if (schema && schema.length) {
          await table.setMetadata({ schema: { fields: schema } });
          const [retryErrors] = await table.insert(rows);
          if (retryErrors && retryErrors.length) {
            functions.logger.error("BigQuery insert errors (after schema set)", retryErrors);
            return { success: false, errors: retryErrors };
          }
          return { success: true };
        }
      }
      throw err;
    }
  } catch (err) {
    functions.logger.error("BigQuery insert failed", err);
    return { success: false, error: err?.message || String(err) };
  }
}

export function getBqConfig() {
  const dataset = process.env.BQ_DATASET || "sneaker_analytics";
  const tableRelease = process.env.BQ_TABLE_RELEASE_EVENTS || "release_events";
  const tableQueue = process.env.BQ_TABLE_QUEUE_EVENTS || "queue_events";
  return { dataset, tableRelease, tableQueue };
}
