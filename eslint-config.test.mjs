import assert from 'node:assert/strict';
import fs from 'node:fs';

const configPath = new URL('./eslint.config.mjs', import.meta.url);
const configText = fs.readFileSync(configPath, 'utf8');

assert.match(configText, /ignores:\s*\[/);
assert.match(configText, /'\.next\/\*\*'/);
assert.match(configText, /'\.worktrees\/\*\*'/);
assert.match(configText, /'dist\/\*\*'/);

console.log('eslint ignore config test passed');
