// Prints the SHA-256 hex digest of a password for the access gate.
//
//   npm run hash-password -- "your secret phrase"
//
import { createHash } from 'node:crypto';

const pw = process.argv.slice(2).join(' ');
if (!pw) {
  console.error('Usage: npm run hash-password -- "your secret phrase"');
  process.exit(1);
}

const hash = createHash('sha256').update(pw, 'utf8').digest('hex');
console.log('\nAdd these lines to your .env file:\n');
console.log('VITE_ACCESS_GATE=on');
console.log(`VITE_ACCESS_HASH=${hash}\n`);
