// Post-processes the generated Postman collection:
// - collection-level Bearer auth bound to {{accessToken}}
// - baseUrl default pointing at local dev API
// - login/refresh requests auto-capture tokens into collection variables
import { readFileSync, writeFileSync } from 'node:fs';

const path = new URL('./fitora-api.postman_collection.json', import.meta.url);
const collection = JSON.parse(readFileSync(path, 'utf8'));

collection.auth = {
  type: 'bearer',
  bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }],
};

collection.variable = [
  { key: 'baseUrl', value: 'http://localhost:3001' },
  { key: 'accessToken', value: '' },
  { key: 'refreshToken', value: '' },
];

const tokenCapture = {
  listen: 'test',
  script: {
    type: 'text/javascript',
    exec: [
      'const json = pm.response.json();',
      'const tokens = json.tokens ?? json;',
      'if (tokens.accessToken) {',
      "  pm.collectionVariables.set('accessToken', tokens.accessToken);",
      "  console.log('accessToken saved to collection variables');",
      '}',
      'if (tokens.refreshToken) {',
      "  pm.collectionVariables.set('refreshToken', tokens.refreshToken);",
      '}',
    ],
  },
};

let captures = 0;
function walk(items) {
  for (const item of items) {
    if (item.item) {
      walk(item.item);
      continue;
    }
    const url = item.request?.url?.path?.join('/') ?? '';
    const method = item.request?.method;
    if (method === 'POST' && /auth\/(login|register|refresh|otp\/verify|google)/.test(url)) {
      item.event = [...(item.event ?? []), tokenCapture];
      captures += 1;
    }
    // Public auth endpoints shouldn't send a bearer token
    if (/^api\/v1\/auth\/(login|register|otp)/.test(url)) {
      item.request.auth = { type: 'noauth' };
    }
    // Ready-to-run bodies for the common login/refresh flows
    if (url === 'api/v1/auth/login' && method === 'POST') {
      item.request.body.raw = JSON.stringify(
        { email: '{{playerEmail}}', password: '{{playerPassword}}' },
        null,
        2,
      );
    }
    if (url === 'api/v1/auth/refresh' && method === 'POST') {
      item.request.body.raw = JSON.stringify({ refreshToken: '{{refreshToken}}' }, null, 2);
    }
  }
}
walk(collection.item);

writeFileSync(path, JSON.stringify(collection, null, 2));
console.log(`done — token capture added to ${captures} auth requests`);
