# Sandbox setup, test numbers and going live

Read this when setting up a sandbox, writing tests, or preparing for production.

## Create a sandbox API user and key

1. Sign up at momodeveloper.mtn.com and subscribe to the product you need (Collection, Disbursement or Remittance). Copy its **primary key** from your profile.
2. Run the setup script (`<skill-dir>` is the folder holding this skill's SKILL.md), with the subscription key in the environment and your callback host (the hostname that will receive callbacks; it must be a hostname you control, served over HTTPS):

   ```
   MOMO_SUBSCRIPTION_KEY=... node <skill-dir>/scripts/sandbox-setup.js --callback-host pay.example.com
   ```

   It creates an API user (`POST /v1_0/apiuser` with a new UUID), generates its API key (`POST /v1_0/apiuser/{id}/apikey`), checks that the pair can get a Collection token, and prints `MOMO_API_USER` and `MOMO_API_KEY` lines for your `.env`. Pass `--product disbursement` or `--product remittance` to check the token against another product, using that product's subscription key.
3. Store the API key immediately. MoMo can't show it again; if it's lost, run the script again for a new user.

The sandbox only accepts target environment `sandbox` and currency `EUR`.

## Sandbox test numbers

For request to pay (and deposit and request to withdraw), the payer's MSISDN decides the result. Any other number succeeds.

| MSISDN | Result |
|---|---|
| `46733123450` | Failed |
| `46733123451` | Rejected |
| `46733123452` | Expired |
| `46733123453` | Ongoing (stays PENDING) |
| `46733123454` | Delayed |
| `46733123455` | Not found |
| `46733123456` | Payee not allowed to receive |
| `46733123457` | Not allowed |
| `46733123458` | Not allowed target environment |
| `46733123459` | Invalid callback URL host |
| `46733123460` | Invalid currency |
| `46733123461` | Internal processing error |
| `46733123462` | Service unavailable |
| `46733123463` | Could not perform transaction |

For the account-holder `active` check, `46733123450` is not found, `…451` not active, `…452` not allowed, `…453` not allowed target environment, `…454` internal processing error and `…455` service unavailable. Refund outcomes are selected by the refund amount (1 to 13); see MTN's sandbox use cases page.

Use `46733123453` (Ongoing) and a stopped callback endpoint to test that polling settles a payment.

## Going live

- Complete MTN's go-live process for your market. Production API users and keys are created in that market's partner portal; sandbox users don't work there.
- Switch the base URL, target environment (for example `mtnghana`) and currency (for example `GHS`) together, from configuration, not code.
- Register your production callback host in the partner portal and make sure the certificate chains to a common public CA.
- For Disbursement, get your server's outbound IP addresses whitelisted, or payouts fail with `403`.
- Confirm the amount format your market accepts (whole units or decimals) with a small real payment.
- Keep sandbox and production credentials in separate secret stores so one can't be used for the other.
