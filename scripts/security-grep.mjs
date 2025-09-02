#!/usr/bin/env node
// Lightweight security grep to fail CI on risky patterns
// - SQL template interpolation inside query strings
// - Logging tokens/passwords/secrets

import { execSync } from 'child_process';

const patterns = [
  {
    name: 'SQL template interpolation',
    cmd: `rg -n --hidden --glob '!node_modules/**' "\\$\\{" src scripts | cat`,
  },
  {
    name: 'Unsafe sql.unsafe usage',
    cmd: `rg -n --hidden --glob '!node_modules/**' "sql\\.unsafe\\(" src scripts | cat`,
  },
  {
    name: 'Sensitive logs',
    cmd: `rg -n --hidden --glob '!node_modules/**' -i "console\\.(log|error|debug).*?(token|password|secret|authorization)" src scripts | cat`,
  },
];

let failures = 0;
patterns.forEach(({ name, cmd }) => {
  try {
    const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    if (out.trim().length > 0) {
      console.error(`\n[SECURITY] ${name} found:`);
      console.error(out);
      failures++;
    } else {
      console.log(`[OK] ${name} — none found`);
    }
  } catch (e) {
    // ripgrep returns non-zero when no matches unless we pipe to cat; still guard here
    const msg = e.stdout?.toString?.() || '';
    if (msg.trim().length > 0) {
      console.error(`\n[SECURITY] ${name} found:`);
      console.error(msg);
      failures++;
    } else {
      console.log(`[OK] ${name} — none found`);
    }
  }
});

if (failures > 0) {
  console.error(`\nSecurity grep checks failed with ${failures} issue group(s).`);
  process.exit(1);
}

console.log('\nSecurity grep checks passed.');
process.exit(0);


