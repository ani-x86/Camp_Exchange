import { parse } from 'csv-parse/sync';

const REQUIRED_HEADERS = [
  'Email',
  'Name of the Student',
  'Password',
  'PRN',
  'R.N.',
];

export function parseStudentCsv(contents) {
  let rows;
  try {
    rows = parse(contents, {
      bom: true,
      skip_empty_lines: true,
    });
  } catch {
    throw new Error('Student CSV is not valid CSV.');
  }

  if (rows.length < 2) {
    throw new Error('Student CSV must include a header and at least one student.');
  }

  const headers = rows[0].map((header) => String(header).trim());
  if (
    new Set(headers).size !== headers.length
    || REQUIRED_HEADERS.some((header) => !headers.includes(header))
  ) {
    throw new Error(`Student CSV must include these columns: ${REQUIRED_HEADERS.join(', ')}.`);
  }

  const index = Object.fromEntries(headers.map((header, i) => [header, i]));
  const prns = new Set();
  const emails = new Set();

  return rows.slice(1).map((row, i) => {
    const recordNumber = i + 2;
    const value = (header) => String(row[index[header]] ?? '');
    const email = value('Email').trim().toLowerCase();
    const name = value('Name of the Student').trim();
    const password = value('Password');
    const prn = value('PRN').trim();
    const rollNumber = value('R.N.').trim();

    if (!email || !name || !password || !prn || !rollNumber) {
      throw new Error(`Student CSV record ${recordNumber} has an empty required field.`);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`Student CSV record ${recordNumber} has an invalid email address.`);
    }
    if (!/^[0-9]+$/.test(prn)) {
      throw new Error(`Student CSV record ${recordNumber} has an invalid PRN.`);
    }
    if (name.length < 2 || name.length > 80) {
      throw new Error(`Student CSV record ${recordNumber} has a name outside the allowed length.`);
    }
    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new Error(`Student CSV record ${recordNumber} has a password too long to hash safely.`);
    }
    if (prns.has(prn)) {
      throw new Error(`Student CSV contains a duplicate PRN at record ${recordNumber}.`);
    }
    if (emails.has(email)) {
      throw new Error(`Student CSV contains a duplicate email at record ${recordNumber}.`);
    }

    prns.add(prn);
    emails.add(email);
    return { email, name, password, prn, rollNumber };
  });
}
