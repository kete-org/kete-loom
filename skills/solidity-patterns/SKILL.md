---
name: solidity-patterns
description: Writes Solidity contracts for Ethereum and other EVM chains the safe way, applying checks-effects-interactions ordering, Ownable2Step or AccessControl roles, OpenZeppelin Contracts instead of hand-rolled tokens, a deliberate choice between immutable and UUPS or transparent proxy deployments with ERC-7201 namespaced storage, events for every state change, custom errors and basic gas hygiene, inside a Foundry or Hardhat project with tests. Use when creating or extending a smart contract, adding an ERC-20, ERC-721 or ERC-1155 token, deciding whether a contract should be upgradeable, or setting up a new Foundry or Hardhat workspace.
license: MIT
compatibility: Any Agent Skills host. Needs Foundry (forge) or Hardhat with Node.js to compile and test. Examples target Solidity 0.8.x and OpenZeppelin Contracts 5.x.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: security
  kete-loom/risk: runs-commands
  kete-loom/requires: "forge"
  kete-loom/owner: "Kete-org"
---

# Solidity patterns

Write contracts that are boring on purpose: audited building blocks, state updated before any external call, every privileged function guarded, every change logged by an event, and tests that try to break it. Deployed code is public and usually permanent, so a bug is a loss, not a ticket. This is engineering guidance, not financial or legal advice.

## Ground rules

1. **Pin the compiler.** `pragma solidity 0.8.x;` with an exact version in `foundry.toml` (`solc_version`) or `hardhat.config` (`solidity.version`). 0.8 reverts on overflow by default; `unchecked { }` only where you proved the bound in a comment.
2. **Use OpenZeppelin Contracts** (`@openzeppelin/contracts`, or `@openzeppelin/contracts-upgradeable` for proxies) for tokens, access control, `ReentrancyGuard`, `SafeERC20`, `ECDSA`, `EIP712`. Never copy-paste or re-implement an ERC standard. Pin the library version.
3. **Checks-effects-interactions.** Validate inputs (checks), write storage (effects), then call other contracts or send ETH (interactions). Add `nonReentrant` on functions that make external calls and touch balances anyway.
4. **Guard every privileged function** (`mint`, `pause`, `setFee`, `withdraw`, `upgradeTo...`, initializers). Default to `Ownable2Step` for a single admin or `AccessControl` for several roles; the owner should be a multisig or timelock in production, not a laptop key.
5. **Events for every state change** an off-chain system or user cares about: transfers, role grants, parameter changes, upgrades, pauses. Index the fields people filter on (addresses, IDs), at most three indexed.
6. **Custom errors** (`error InsufficientBalance(uint256 have, uint256 want);` with `revert InsufficientBalance(...)`) instead of revert strings.
7. **Pull over push** for payouts: record what each address is owed and let it `withdraw()`; never loop over an unbounded array sending ETH.
8. **No `tx.origin` for auth**, no `block.timestamp` or `blockhash` as randomness, no `selfdestruct`, no `delegatecall` to an address a user can influence.

## Project layout

Foundry (preferred for new work): `forge init`, then

```
src/            contracts
test/           *.t.sol tests (forge-std Test), fuzz and invariant tests
script/         *.s.sol deploy scripts (forge script)
lib/            dependencies (forge install OpenZeppelin/openzeppelin-contracts)
foundry.toml    solc_version, optimizer, remappings, [fuzz] runs
```

Hardhat: `contracts/`, `test/`, `ignition/modules/` or `scripts/`, `hardhat.config.ts`, dependencies from npm. Follow whichever the repo already uses; don't mix both without reason.

Keys and RPC URLs come from environment variables or an encrypted keystore (`cast wallet import`), never from committed files.

## Steps for a new or changed contract

1. **Write the spec first** in the contract's NatSpec: who can call each external function, what invariants must hold (for example "sum of balances == totalSupply", "only owner can mint"), and what happens on failure.
2. **Pick the building block.** Token: inherit `ERC20`, `ERC721` or `ERC1155` and add only what's needed (`ERC20Permit`, `ERC20Votes`, `Pausable`). Do not override `transfer` or `_update` hooks unless the spec needs it, and then call `super`.
3. **Decide on upgradeability** using the table below. Write the answer and the reason at the top of the contract.
4. **Write the contract** following the ground rules. Mark functions `external` when not called internally, state `immutable` or `constant` where possible, and visibility on everything.
5. **Handle tokens defensively.** Use `SafeERC20` (`safeTransfer`, `safeTransferFrom`, `forceApprove`) for arbitrary ERC-20s. For deposits, measure the balance before and after if fee-on-transfer tokens are possible, or document that they're unsupported.
6. **Test**: unit tests for each function and each revert, a test per access-controlled function proving a stranger is rejected, fuzz tests on amount inputs, and invariant tests for the spec's invariants (`forge test`, `[invariant]` in `foundry.toml`). Fork tests (`--fork-url`) when integrating live protocols.
7. **Static analysis**: run `slither .` and fix or justify every finding. For the full audit procedure use the `smart-contract-security` skill.
8. **Deploy** to a local node (`anvil`) and a testnet first with the same script you'll use on mainnet; verify the source on the block explorer.

## Upgradeability: decide deliberately

| Option | Choose when | Costs |
|---|---|---|
| Immutable contract | Logic is small, well tested, and trust minimisation matters | Bugs need a migration to a new address |
| UUPS proxy (`UUPSUpgradeable`) | You need upgrades and want them cheap; upgrade logic lives in the implementation | Forgetting `_authorizeUpgrade` access control, or shipping an implementation without it, can brick or hand over the proxy |
| Transparent proxy (`TransparentUpgradeableProxy`) | You want the admin path separated from user calls | Extra deploy cost; in OZ 5.x the proxy deploys its own `ProxyAdmin` owned by `initialOwner` |

Rules for any proxy:

- No constructor logic; use an `initialize` function with the `initializer` modifier, call every parent `__X_init`, and call `_disableInitializers()` in the implementation's constructor.
- Use ERC-7201 namespaced storage (the OZ 5.x upgradeable contracts do) or append-only layouts; never reorder, remove or change the type of an existing state variable.
- Check every upgrade with the OpenZeppelin Upgrades plugin (`@openzeppelin/hardhat-upgrades` or `openzeppelin-foundry-upgrades`) before deploying it.
- Put upgrades behind a multisig and, where users hold funds, a timelock so they can exit.

## Gas basics (after correctness)

- Cache storage reads in memory inside loops; pack small types that are read together into one slot.
- `calldata` instead of `memory` for read-only external array and struct arguments.
- `immutable`/`constant` for values fixed at deploy.
- Avoid unbounded loops over user-growable arrays; they become a denial of service once gas exceeds the block limit.
- Measure with `forge test --gas-report` or `forge snapshot` before and after; never trade a safety check for gas.

## Stop and ask the user

- Before deploying or broadcasting anything to a mainnet, or to any network with real funds; confirm the network, chain ID and deployer address.
- Who should own admin roles in production (EOA, multisig, timelock, or renounced).
- Whether the contract should be upgradeable at all, when the spec doesn't say.
- Before writing token economics, fees or anything that holds user funds and will launch without a professional audit; recommend one.

## Never

- Never put private keys, mnemonics or RPC keys in source, tests or scripts.
- Never write a custom ERC-20/721 from scratch, a custom signature scheme, or inline assembly to save gas without a written reason and tests.
- Never leave an initializer unprotected or an implementation contract uninitialized.
- Never claim a contract is secure; say what was tested and what wasn't.

## Before you finish

Report: compiler version, libraries and versions, upgradeability choice and why, roles and who holds them, events emitted, test and fuzz results (`forge test` output summary), Slither results, and what still needs an external audit.
