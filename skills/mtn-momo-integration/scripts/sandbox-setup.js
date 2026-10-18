#!/usr/bin/env node
'use strict';

// Creates an MTN MoMo sandbox API user and API key, then checks they can get an access token.
// Sandbox only: production API users come from MTN's partner portal.
//
//   MOMO_SUBSCRIPTION_KEY=<product primary key> node sandbox-setup.js --callback-host pay.example.com [--product collection]
//
// Prints MOMO_API_USER / MOMO_API_KEY lines for your .env. The subscription key is never printed.

const crypto = require('crypto');

const SANDBOX = 'https://sandbox.momodeveloper.mtn.com';
const PRODUCTS = ['collection', 'disbursement', 'remittance'];

function parseArgs(argv) {
  const opts = { product: 'collection' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--callback-host') opts.callbackHost = argv[++i];
    else if (argv[i] === '--product') opts.product = argv[++i];
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  if (!opts.callbackHost) throw new Error('--callback-host is required (a hostname such as pay.example.com)');
  // MoMo matches callback URLs against this host, and rejects IPs: a bare hostname only.
  if (!/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(opts.callbackHost)) {
    throw new Error(`--callback-host must be a bare hostname like pay.example.com, not "${opts.callbackHost}"`);
  }
  if (!PRODUCTS.includes(opts.product)) throw new Error(`--product must be one of ${PRODUCTS.join(', ')}`);
  return opts;
}

async function call(fetchImpl, url, init, expected) {
  const res = await fetchImpl(url, init);
  const text = await res.text();
  if (res.status !== expected) throw new Error(`${init.method} ${url.replace(SANDBOX, '')} returned ${res.status}: ${text.slice(0, 300) || '(empty body)'}`);
  return text ? JSON.parse(text) : null;
}

async function setup({ subscriptionKey, callbackHost, product = 'collection', fetchImpl = fetch, uuid = crypto.randomUUID }) {
  if (!subscriptionKey) throw new Error('set MOMO_SUBSCRIPTION_KEY to the primary key of the product you subscribed to');
  const apiUser = uuid();
  const key = { 'ocp-apim-subscription-key': subscriptionKey };

  await call(fetchImpl, `${SANDBOX}/v1_0/apiuser`, {
    method: 'POST',
    headers: { ...key, 'x-reference-id': apiUser, 'content-type': 'application/json' },
    body: JSON.stringify({ providerCallbackHost: callbackHost }),
  }, 201);

  const { apiKey } = await call(fetchImpl, `${SANDBOX}/v1_0/apiuser/${apiUser}/apikey`, { method: 'POST', headers: key }, 201);

  // No body on the token call: MoMo rejects one with 400.
  const basic = Buffer.from(`${apiUser}:${apiKey}`).toString('base64');
  const token = await call(fetchImpl, `${SANDBOX}/${product}/token/`, { method: 'POST', headers: { ...key, authorization: `Basic ${basic}` } }, 200);
  if (!token || !token.access_token) throw new Error('token call succeeded but returned no access_token');

  return { apiUser, apiKey, expiresIn: token.expires_in };
}

async function main(argv, env = process.env) {
  try {
    const opts = parseArgs(argv);
    const r = await setup({ subscriptionKey: env.MOMO_SUBSCRIPTION_KEY, ...opts });
    console.log(`# MoMo sandbox API user for ${opts.callbackHost} (token check against ${opts.product} passed${r.expiresIn ? `, expires_in ${r.expiresIn}s` : ''})`);
    console.log('# Store these now: MoMo cannot show this API key again.');
    console.log(`MOMO_BASE_URL=${SANDBOX}`);
    console.log('MOMO_TARGET_ENVIRONMENT=sandbox');
    console.log(`MOMO_API_USER=${r.apiUser}`);
    console.log(`MOMO_API_KEY=${r.apiKey}`);
    return 0;
  } catch (e) {
    console.error(`sandbox-setup: ${e.message}`);
    return 1;
  }
}

if (require.main === module) main(process.argv.slice(2)).then((code) => (process.exitCode = code));

module.exports = { parseArgs, setup, main };
