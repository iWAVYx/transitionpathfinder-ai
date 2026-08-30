import assert from 'node:assert/strict';
import test from 'node:test';

import { brokeredPreviewStorage } from '../src/integrations/supabase/previewAuthStorage.ts';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function installEnvironment({ hostname, framed = false, ancestor = '' }) {
  const storage = memoryStorage();
  let messageListener;
  const parent = framed
    ? {
        postMessage(message, targetOrigin) {
          if (targetOrigin !== ancestor || !messageListener) return;
          const value = message.type.endsWith(':get') ? 'remote-session' : undefined;
          queueMicrotask(() =>
            messageListener({
              origin: ancestor,
              data: {
                type: 'lovable-preview-auth:result',
                requestId: message.requestId,
                ok: true,
                value,
              },
            }),
          );
        },
      }
    : undefined;

  const windowObject = {
    parent: parent ?? null,
    addEventListener(type, listener) {
      if (type === 'message') messageListener = listener;
    },
    removeEventListener(type, listener) {
      if (type === 'message' && messageListener === listener) messageListener = undefined;
    },
  };
  if (!framed) windowObject.parent = windowObject;

  Object.assign(global, {
    window: windowObject,
    location: { hostname, ancestorOrigins: ancestor ? [ancestor] : [] },
    document: { referrer: ancestor ? `${ancestor}/projects/example` : '' },
    localStorage: storage,
  });

  return { storage };
}

test('keeps the production custom domain on localStorage', () => {
  const { storage } = installEnvironment({
    hostname: 'transitionforwardct.com',
    framed: true,
    ancestor: 'https://lovable.dev',
  });

  assert.equal(brokeredPreviewStorage(), storage);
});

test('keeps the public lovable.app domain on localStorage', () => {
  const { storage } = installEnvironment({
    hostname: 'transitionpathfinder-ai.lovable.app',
    framed: true,
    ancestor: 'https://lovable.dev',
  });

  assert.equal(brokeredPreviewStorage(), storage);
});

test('brokers storage only for a framed UUID preview on a trusted editor origin', async () => {
  installEnvironment({
    hostname: 'id-preview--a4a5068b-10df-4e31-8d22-73186657d452.lovable.app',
    framed: true,
    ancestor: 'https://lovable.dev',
  });

  const storage = brokeredPreviewStorage();
  assert.notEqual(storage, localStorage);

  await storage.setItem('sb-session', 'local-session');
  assert.equal(localStorage.getItem('sb-session'), 'local-session');
  assert.equal(await storage.getItem('sb-session'), 'remote-session');

  await storage.removeItem('sb-session');
  assert.equal(localStorage.getItem('sb-session'), null);
});
