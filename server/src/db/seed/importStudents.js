import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, disconnectDB } from '../pool.js';
import { parseStudentCsv } from '../studentRoster.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = resolve(__dirname, '../../../..', 'StudentDB.csv');

async function importStudents() {
  const csv = await readFile(CSV_PATH, 'utf8');
  const students = parseStudentCsv(csv);
  let client;
  let transactionStarted = false;

  try {
    client = await getPool().connect();
    await client.query('BEGIN');
    transactionStarted = true;
    for (const student of students) {
      const passwordHash = await bcrypt.hash(student.password, 12);
      await client.query(
        `INSERT INTO students (prn, name, college_email, password_hash, roll_number)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (prn) DO UPDATE
           SET name = EXCLUDED.name,
               college_email = EXCLUDED.college_email,
               password_hash = EXCLUDED.password_hash,
               roll_number = EXCLUDED.roll_number,
               imported_at = now()`,
        [student.prn, student.name, student.email, passwordHash, student.rollNumber]
      );
    }
    await client.query('COMMIT');
    transactionStarted = false;
    console.log(`[students:import] Imported ${students.length} student records.`);
  } catch (error) {
    if (client && transactionStarted) {
      await client.query('ROLLBACK');
    }
    if (error.code) {
      console.error(`[students:import] Database import failed (error code ${error.code}).`);
    } else {
      console.error(`[students:import] ${error.message}`);
    }
    process.exitCode = 1;
  } finally {
    client?.release();
    await disconnectDB();
  }
}

importStudents().catch((error) => {
  console.error(`[students:import] ${error.code ? `Database connection failed (${error.code}).` : error.message}`);
  process.exitCode = 1;
});
