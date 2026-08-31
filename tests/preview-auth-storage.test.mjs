import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const CLIENT_FILE = new URL('../src/integrations/supabase/client.ts', import.meta.url);
const INTEGRATIONS_DIR = new URL('../src/integrations/supabase/', import.meta.url);

test('uses the supported Supabase browser storage instead of a custom preview broker', () => {
  const clientSource = readFileSync(CLIENT_FILE, 'utf8');

  assert.doesNotMatch(clientSource, /previewAuthStorage|brokeredPreviewStorage/);
  assert.doesNotMatch(clientSource, /storage\s*:/);
  assert.match(clientSource, /persistSession:\s*true/);
  assert.match(clientSource, /autoRefreshToken:\s*true/);
});

test('does not send authentication sessions through an invented Lovable postMessage protocol', () => {
  const clientSource = readFileSync(CLIENT_FILE, 'utf8');

  assert.doesNotMatch(clientSource, /lovable-preview-auth|postMessage/);
  assert.throws(
    () => readFileSync(new URL('previewAuthStorage.ts', INTEGRATIONS_DIR), 'utf8'),
    { code: 'ENOENT' },
  );
});
