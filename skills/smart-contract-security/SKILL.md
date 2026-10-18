---
name: smart-contract-security
description: Security audit procedure for Solidity and EVM smart contracts that maps the system's funds, roles and trust assumptions, then hunts reentrancy (including cross-function and read-only), broken access control, price oracle and flash-loan manipulation, rounding and precision loss in share maths, front-running and MEV exposure, signature replay across chains and nonces, and proxy upgrade risks, backed by Slither static analysis plus Foundry, Echidna or Medusa fuzzing and invariant tests, ending in a severity-rated report with a clear professional-audit boundary. Use when auditing a protocol or token contract before deployment, investigating a suspected exploit path, writing invariant tests to break a contract, or deciding whether code is ready for an external audit.
license: MIT
compatibility: Any Agent Skills host. Needs Foundry (forge) or Hardhat to build and test; Slither (Python 3.10+) for static analysis; Echidna or Medusa optional for property fuzzing.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: security
  kete-loom/risk: runs-commands
  kete-loom/requires: "forge, slither"
  kete-loom/owner: "Kete-org"
---

# Smart contract security

Find the ways a contract loses or locks funds, prove each with a failing test, and say plainly what the review did not cover. Exploits are permanent and public, so a finding without a reproduction is a lead, not a conclusion.

## What this skill is not

- **Not a professional audit.** It is a structured internal review. Any contract that will hold meaningful user funds, mint a token with market value, or bridge assets needs at least one independent audit by a qualified firm, and ideally a bug bounty, before mainnet. Say so in every report.
- Not financial, legal or token-regulation advice.
- Not a guarantee: no finding list proves the absence of bugs.

## 1. Scope and threat model

1. Pin the exact commit, compiler version and the list of in-scope files. Build it (`forge build` or `npx hardhat compile`); if it doesn't compile, stop and ask.
2. Write down, before reading code in depth:
   - **Assets**: what the contracts hold (ETH, tokens, NFTs, accounting balances) and where the totals live.
   - **Actors and roles**: users, admins, keepers, oracles, bridges, other protocols; what each can do.
   - **Trust assumptions**: which external contracts and tokens are trusted, which price feeds, and what a malicious or upgraded dependency could do.
   - **Invariants**: statements that must always hold (solvency, `totalShares` matches the sum of balances, only role X changes parameter Y).
3. Map every external and public function that moves value or changes privileged state. Run `slither . --print human-summary` and `--print function-summary` to get the inventory.

## 2. Automated pass

1. `slither .` from the project root (filter out `lib/` or `node_modules` per the Slither wiki). Triage every high and medium detector result: true positive, false positive with reason, or needs a test.
2. For proxies, `slither-check-upgradeability` against the old and new implementation, plus the OpenZeppelin Upgrades plugin's validation.
3. Existing tests: `forge test -vvv` and `forge coverage`. Note functions with no test of their revert paths.

Tool output is a starting point. Never report a detector result as a finding without reading the code path.

## 3. Manual review, in this order

Work through `references/vulnerability-checklist.md`. The headline classes:

1. **Reentrancy**: external calls (ETH sends, token transfers, hooks in ERC-721/1155/777 receivers, arbitrary `call`) before state is updated; cross-function and cross-contract reentrancy that `nonReentrant` on one function doesn't cover; read-only reentrancy where another protocol reads a stale view mid-call.
2. **Access control**: unguarded privileged functions, unprotected or re-callable initializers, uninitialized implementation contracts, role admin misconfiguration, `tx.origin` auth, missing two-step ownership transfer.
3. **Oracle and price manipulation**: spot prices from an AMM pool's reserves or `balanceOf`, which a flash loan can move within one transaction; Chainlink answers used without checking staleness (`updatedAt`), round completeness and sequencer uptime on L2s; donation attacks on share-price vaults (ERC-4626 inflation).
4. **Integer and rounding**: rounding in the user's favour on deposit/withdraw or mint/redeem, division before multiplication, precision loss with low-decimal tokens, `unchecked` blocks, unsafe downcasts (`uint128(x)` silently truncates; use `SafeCast`).
5. **Front-running and MEV**: missing slippage limits (`minAmountOut`) and deadlines on swaps, commit-reveal missing where order matters, approval race conditions, sandwichable liquidations or auctions.
6. **Signature replay**: signatures without a nonce, without `block.chainid` and contract address in the EIP-712 domain, reusable after cancel, malleable (use OZ `ECDSA`, not raw `ecrecover`), or `ecrecover` returning `address(0)` accepted as a valid signer.
7. **Upgrade risks**: storage layout collisions between versions, missing `_authorizeUpgrade` guard, selector clashes in proxies, upgrade keys held by a single EOA, no timelock.
8. **Token integration**: fee-on-transfer and rebasing tokens, tokens that return `false` instead of reverting (use `SafeERC20`), tokens with blocklists or pausable transfers, 6 vs 18 decimals.
9. **Denial of service and griefing**: unbounded loops, push payments to contracts that revert, dust positions that block liquidation.

## 4. Prove it

For every candidate finding, write a Foundry test that demonstrates it (an exploit test that passes when the bug exists), or a fuzz/invariant test that breaks:

- Fuzz: functions taking `uint256 amount` with `bound()` to realistic ranges.
- Invariant: a handler contract that calls the system's functions in random order, with `invariant_` functions asserting the invariants from step 1 (`[invariant] runs` and `depth` in `foundry.toml`).
- Fork tests (`forge test --fork-url $RPC_URL`) for oracle and integration issues against real pool state.
- Echidna or Medusa for longer property campaigns when the invariants are numerous.

Findings you couldn't reproduce are reported as "unconfirmed", with the reasoning.

## Severity

| Severity | Meaning |
|---|---|
| Critical | Direct theft or permanent freezing of user funds, or takeover of admin/upgrade, by an unprivileged attacker |
| High | Loss of funds under realistic conditions, or protocol insolvency |
| Medium | Loss of yield, temporary freezing, or a privileged role able to harm users beyond the documented trust model |
| Low | Hardening, best-practice deviations with no direct loss path |
| Info | Gas, style, documentation |

## Stop and ask the user

- If you find a critical issue in a contract that is already deployed with funds: stop the review, tell the user immediately, and recommend they contact a security firm or an emergency response group and follow responsible disclosure. Do not publish details, open public issues, or run the exploit on mainnet.
- Before running anything against a live network other than read-only fork tests.
- If scope, the trust model or intended admin powers are unclear.

## Never

- Never broadcast transactions, use real private keys, or test exploits on mainnet or public testnets against contracts you don't own.
- Never mark a contract "secure", "safe" or "audited". Say "no issues found in the reviewed scope".
- Never drop the professional-audit recommendation for contracts that will hold funds.

## Report format

```
## Smart contract review: <repo>@<commit>
Scope: <files>, solc <version>. Out of scope: <...>
Threat model: assets, roles, trust assumptions, invariants (short)

### Findings
1. [Critical] Vault.sol:142 — <title>
   Class: reentrancy | access control | oracle | rounding | MEV | signature | upgrade | token | DoS
   Impact: <who loses what, under what conditions>
   Proof: test/exploits/<Name>.t.sol (passes = bug present) | unconfirmed: <why>
   Fix: <smallest change that removes the root cause>

### Tooling
Slither: <n> results triaged (<n> true positives). Fuzz/invariant: <runs, depth, results>. Coverage: <%>.

### Not covered
<economic design, off-chain components, dependencies, anything skipped>

This is an internal review, not a professional audit. Contracts that will hold user funds need an independent audit before mainnet.
```
