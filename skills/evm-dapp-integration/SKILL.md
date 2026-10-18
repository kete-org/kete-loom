---
name: evm-dapp-integration
description: Connects web frontends and backends to Ethereum and EVM chains with viem (optionally wagmi) or ethers v6, covering EIP-1193 and EIP-6963 wallet discovery and connection, checking and switching chain IDs, typed contract reads, simulating before writes, token amounts kept as bigint with parseUnits and formatUnits against each token's decimals, the transaction lifecycle from signature to receipt status and confirmations, replaced or dropped transactions, event logs, and RPC rate limits and block-range caps. Use when adding a connect-wallet button, calling a deployed contract from a dapp or Node service, displaying or sending ERC-20 amounts, or debugging stuck transactions and RPC errors.
license: MIT
compatibility: Any Agent Skills host. Needs Node.js 18+ and the project's package manager; examples use viem 2.x and ethers 6.x. Live calls need an RPC endpoint and network access.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: integrations
  kete-loom/risk: network
  kete-loom/owner: "Kete-org"
---

# EVM dapp integration

Make the app talk to the chain without losing precision, sending to the wrong network, or telling the user "done" before the chain agrees. Private keys belong to the user's wallet, not your code. This is engineering guidance, not financial advice.

## Ground rules

1. **Amounts are `bigint` in base units, end to end.** Convert at the edges only: `parseUnits(input, decimals)` from user text, `formatUnits(value, decimals)` for display (both in viem and ethers v6). Never use `Number`, `parseFloat` or JavaScript floats for token amounts; never assume 18 decimals (USDC and USDT are 6 on most chains). Read `decimals()` from the token or a reviewed token list.
2. **Check the chain ID before every write.** Compare the wallet's chain to the one your contract addresses belong to; prompt a switch (`switchChain` in viem/wagmi, `wallet_switchEthereumChain` via EIP-1193) rather than sending on the wrong network. Keep contract addresses in a map keyed by chain ID.
3. **Simulate, then write.** viem: `publicClient.simulateContract(...)` then `walletClient.writeContract(request)`. ethers v6: `contract.fn.staticCall(...)` or `estimateGas` before sending. Show the decoded revert reason if the simulation fails.
4. **A hash is not a success.** `writeContract`/`sendTransaction` returns only a hash. Wait for the receipt (`waitForTransactionReceipt({ hash, confirmations })` in viem, `await tx.wait(confirmations)` in ethers) and check it: viem returns the receipt with `status` `'success'` or `'reverted'` (it does not throw on revert); ethers v6 `wait()` throws a `CALL_EXCEPTION` error when the receipt status is `0`, so catch it.
5. **No private keys in frontends.** Browser code signs through the user's wallet only. Backend signers load keys from a secret manager or KMS, never from the repo or a `NEXT_PUBLIC_`/`VITE_` variable.
6. **Treat chain data as untrusted input.** Token names, symbols and metadata URIs can be anything; escape them before rendering.

## Library choice

| Situation | Use |
|---|---|
| React app with wallets | wagmi on top of viem, with a connector kit if the project already has one |
| Non-React frontend or Node service | viem `createPublicClient` / `createWalletClient` with `http()` or `webSocket()` transport |
| Existing ethers codebase | stay on ethers v6 (`BrowserProvider`, `JsonRpcProvider`, `Contract`); don't mix libraries in one module |

Generate types from ABIs (`as const` ABI with viem, or TypeChain/wagmi CLI) so function names and argument types are checked at compile time.

## Steps

1. **Config**: chains the app supports, RPC URLs per chain from environment variables, contract addresses per chain ID, ABIs as `const` exports. Use a paid or self-hosted RPC for production; public endpoints rate-limit hard.
2. **Wallet connection**: discover injected wallets with EIP-6963 (wagmi and most kits do this), fall back to `window.ethereum` (EIP-1193). Request accounts only on a user click. Listen for `accountsChanged` and `chainChanged` and reset app state on both.
3. **Reads**: `readContract` or `multicall` (viem) / `contract.fn()` (ethers). Batch reads with multicall instead of N calls. Pin a `blockNumber` when several reads must be consistent.
4. **Writes**:
   - Validate inputs and convert amounts with the token's decimals.
   - For ERC-20 spends, read `allowance` first; request an exact `approve` amount by default, not unlimited, unless the user opts in. Prefer EIP-2612 `permit` when the token supports it.
   - Simulate, send, show the hash with an explorer link, then wait for the receipt.
5. **Lifecycle states in the UI**: `awaiting signature` → `pending` (hash known) → `confirmed` (receipt `success` with N confirmations) or `reverted` / `rejected by user` / `replaced`. Handle user rejection (EIP-1193 error code `4001`) as a normal cancel, not an error.
6. **Confirmations**: 1 is fine for UI feedback on L2s; for anything that releases off-chain value (crediting a deposit, shipping goods) wait for more blocks or the chain's finalized block (`getBlock({ blockTag: 'finalized' })`), and make the crediting idempotent per `(chainId, txHash, logIndex)`.
7. **Replaced transactions**: users speed up or cancel in their wallet, which changes the hash. viem's `waitForTransactionReceipt` reports this through `onReplaced` with reason `replaced`, `repriced` or `cancelled`; ethers `tx.wait()` throws a `TRANSACTION_REPLACED` error. Follow the new hash or show the cancel.
8. **Events**: `watchContractEvent` / `getLogs` (viem) or `contract.on` / `queryFilter` (ethers). Backfill history in block-range chunks (providers cap `eth_getLogs` ranges and result counts; check yours), and handle reorgs by re-reading recent blocks.
9. **RPC limits**: add retries with backoff for HTTP 429 and timeouts, a fallback transport (`fallback([http(a), http(b)])` in viem), and caching for reads that don't change per block.

## Backend services

- Use a dedicated hot wallet with only the funds it needs; track nonces yourself if sending concurrently, or serialise sends.
- Set `maxFeePerGas`/`maxPriorityFeePerGas` from `estimateFeesPerGas` (viem) or `getFeeData` (ethers), with a cap.
- Index by `(chainId, txHash, logIndex)` and never credit the same log twice.

## Stop and ask the user

- Before sending any transaction on a mainnet, or from a key that holds real funds.
- Which chains and which RPC provider to support in production.
- Whether to request unlimited token approvals.
- How many confirmations count as final for crediting value.

## Never

- Never hard-code a private key or mnemonic, even for a "test" wallet in committed code.
- Never compute amounts with floats or display a balance without its token's decimals.
- Never mark an action complete from the hash alone.
- Never trust a contract address or chain ID that comes from URL parameters or user input without checking it against your allow-list.

## Before you finish

Test against a local node (`anvil`, optionally `--fork-url` for real contract state) or a testnet: connect, wrong-network prompt, a read, an approve plus a write, a user rejection, a reverting call (simulation shows the reason), and a replaced transaction. Report the library versions, chains and addresses used, and anything not tested.
