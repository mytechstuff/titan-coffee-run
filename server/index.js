import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

import { validateAllFields, qualifyApplicant } from '../src/qualify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'credit_applications.json');

async function ensureDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_FILE);
  } catch (err) {
    // create empty array file
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

function nowISO() {
  return new Date().toISOString();
}

async function appendApplication(record) {
  await ensureDataFile();
  const content = await fs.readFile(DATA_FILE, 'utf8');
  let arr = [];
  try { arr = JSON.parse(content || '[]'); } catch(e) { arr = []; }
  arr.push(record);
  await fs.writeFile(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from project root so you can open /apply.html
app.use(express.static(path.resolve(__dirname, '..')));

// parse JSON and urlencoded body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple health route
app.get('/health', (req, res) => res.json({ status: 'ok', time: nowISO() }));

// POST endpoint for credit applications
app.post('/api/credit/apply', async (req, res) => {
  try {
    // Accept either JSON or form-encoded data; body-parser already handles it
    const data = { ...req.body };

    // Ensure boolean consent properly parsed for form posts
    if (typeof data.consent === 'string') {
      data.consent = data.consent === 'on' || data.consent === 'true';
    }

    // Run server-side validation (use the same comprehensive validator as the client)
    const errors = validateAllFields(data);
    if (errors.length) {
      // Return 400 with the array of { field, message }
      return res.status(400).json({ errors });
    }

    // Run qualification logic
    const decision = qualifyApplicant(data);

    // Build application record (avoid storing raw sensitive strings in logs)
    const record = {
      id: `${Date.now()}`,
      createdAt: nowISO(),
      applicant: {
        email: data.email || null,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
      },
      // store last4 SSN with caution
      ssnLast4: data.ssnLast4 ? String(data.ssnLast4).slice(-4) : null,
      grossIncome: data.grossIncome ? Number(data.grossIncome) : null,
      consent: !!data.consent,
      requestedAmount: data.requestedAmount ? Number(data.requestedAmount) : null,
      decision,
    };

    await appendApplication(record);

    // Return a friendly, non-sensitive response
    if (decision.decision === 'approved') {
      return res.json({ decision: 'approved', creditAmount: decision.creditAmount, message: 'Approved' });
    }

    return res.json({ decision: 'declined', reason: decision.reason || 'not_eligible', message: 'Not eligible for credit' });

  } catch (err) {
    console.error('Error handling /api/credit/apply', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Titan credit server listening on http://localhost:${PORT}`);
});
