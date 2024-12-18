import { serve } from '@hono/node-server';
import { sha256 } from '@noble/hashes/sha256';
import Database from 'better-sqlite3';
import { Hono, type Context } from 'hono';

const port = 3000;

type PaymentPayload = {
  ccNumber: string;
  amount: string;
};

type PaymentRecord = {
  id: string;
  ccNumber: string;
  amount: string;
  createdAt: string;
};

// Initialize Hono app
const app = new Hono();

// Initialize SQLite as the primary database
const sqlite = new Database('./payments.db', { verbose: console.log });

// Create the payments table if it doesn't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    ccNumber TEXT NOT NULL,
    amount TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )
`);

// In-memory database using Node.js Map
const inMemoryDB: Map<string, PaymentRecord> = new Map();

/**
 * Generate UUID from payload
 */
function generateUUID(payload: PaymentPayload): string {
  const hash = sha256(JSON.stringify(payload));
  return Array.from(hash)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Check if a record exists in SQLite
 */
function checkRecordInSQLite(uuid: string): Promise<PaymentRecord | undefined> {
  return new Promise((resolve, reject) => {
    try {
      const stmt = sqlite.prepare(`SELECT * FROM payments WHERE id = ?`);
      const record = stmt.get(uuid);
      resolve(record as PaymentRecord);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Insert payment record into SQLite
 */
function insertPaymentRecord(uuid: string, payload: PaymentPayload): Promise<PaymentRecord> {
  return new Promise((resolve, reject) => {
    try {
      const stmt = sqlite.prepare(`INSERT INTO payments (id, ccNumber, amount, createdAt) VALUES (?, ?, ?, ?)`);
      const createdAt = new Date().toISOString();
      stmt.run(uuid, payload.ccNumber, payload.amount, createdAt);
      resolve({ id: uuid, ...payload, createdAt });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Fetch all records from SQLite
 */
async function fetchAllRecordsFromSQLite(): Promise<PaymentRecord[]> {
  return new Promise((resolve, reject) => {
    try {
      const stmt = sqlite.prepare(`SELECT * FROM payments`);
      const records = stmt.all();
      resolve(records as PaymentRecord[]);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Payment Idempotent API Endpoint
 */
app.post('/payment', async (c: Context) => {
  const { ccNumber, amount }: PaymentPayload = await c.req.json();

  if (!ccNumber || !amount) {
    return c.json({ error: 'ccNumber and amount are required.' }, 400);
  }

  const payload = { ccNumber, amount };
  const uuid = generateUUID(payload);

  // Check in-memory database
  if (inMemoryDB.has(uuid)) {
    return c.json({
      uuid,
      data: inMemoryDB.get(uuid),
      message: 'Idempotent response: Data already exists.'
    });
  }

  // Check SQLite
  const dbRecord = await checkRecordInSQLite(uuid);
  if (dbRecord) {
    // Cache the result in in-memory DB
    inMemoryDB.set(uuid, dbRecord);
    return c.json({
      uuid,
      data: dbRecord,
      message: 'Idempotent response: Data fetched from SQLite.'
    });
  }

  // Insert into SQLite
  const savedRecord = await insertPaymentRecord(uuid, payload);

  // Cache the result in in-memory DB
  inMemoryDB.set(uuid, savedRecord);

  return c.json(
    {
      uuid,
      data: savedRecord,
      message: 'Data successfully created.'
    },
    201
  );
});

/**
 * Fetch all data (for testing)
 */
app.get('/all-data', async (c: Context) => {
  try {
    const cache = Array.from(inMemoryDB.entries());
    const database = await fetchAllRecordsFromSQLite();
    return c.json({
      cache,
      database
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return c.json({ error: 'Failed to fetch data' }, 500);
  }
});

app.get('/', c => {
  return c.text('Hello Hono!');
});

console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});
