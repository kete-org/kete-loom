---
name: redis-patterns
description: Redis and Valkey design for application code, covering which data structure fits each job, key naming and TTLs, cache-aside with stampede protection, single-instance locks and their limits, Streams consumer groups versus pub/sub, and maxmemory, eviction and persistence settings. Use when adding a Redis cache, rate limiter, queue, leaderboard or lock, reviewing Redis keys and commands for memory or latency problems, or choosing eviction and AOF or RDB settings.
license: MIT
compatibility: Any Agent Skills host. Commands are Redis protocol and work with redis-cli; examples apply to any client library. Newer commands (hash field TTLs, DELEX) need a recent server, so check the version first.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: runs-commands
  kete-loom/requires: "redis-cli"
  kete-loom/owner: "Kete-org"
---

# Redis patterns

Use Redis for what it is good at: small, hot, mostly derived data with known access paths. Every key has an owner, a shape and a lifetime. If a design breaks one of the rules below, say so before writing code.

## 0. Before you start

1. Find the client library and how it connects (single node, Sentinel, Cluster, or a managed service). Search the codebase for the client constructor and the connection URL variable.
2. Find the server version: `redis-cli INFO server` (look at `redis_version`, or `valkey_version` on Valkey). Only use a command if that version has it. The command pages on redis.io list a "since" version.
3. Decide whether this Redis is a **cache** (losing data is fine) or a **store** (losing data is an incident). **Stop and ask the user** if you can't tell; the eviction and persistence settings depend on it.
4. Never run `KEYS *`, `FLUSHALL`, `FLUSHDB`, `DEBUG` or `CONFIG SET` against a shared or production instance. Use `SCAN` with `MATCH` and `COUNT` to inspect keys, and ask before any write to a non-local server.

## 1. Pick the data structure by access pattern

| Need | Use | Not |
|---|---|---|
| One cached value or counter | String (`SET`/`GET`, `INCR`) | A JSON blob you rewrite to change one field |
| An object whose fields you read or update separately | Hash (`HSET`, `HGET`, `HINCRBY`) | One key per field |
| Ranking, time-ordered index, sliding-window limiter | Sorted set (`ZADD`, `ZRANGE ... BYSCORE`, `ZREMRANGEBYSCORE`) | A list you sort in the app |
| Membership or deduplication | Set (`SADD`, `SISMEMBER`) | A list scanned with `LRANGE` |
| Approximate unique counts | HyperLogLog (`PFADD`, `PFCOUNT`) | A set holding millions of IDs |
| A durable work queue with acknowledgement | Stream with a consumer group | A list with `BLPOP` when losing a job matters |
| Fire-and-forget fan-out to connected clients | Pub/sub | Pub/sub for anything that must not be lost |

Keep each value small, ideally under about 100 KB. Big values and big collections block the single command thread while they are read, written or deleted. Delete big keys with `UNLINK`, not `DEL`, and page through big collections with `HSCAN`, `SSCAN` or `ZSCAN`.

## 2. Key design and TTLs

- Name keys `<app>:<entity>:<id>[:<facet>]`, for example `shop:user:42:cart`. Lower case, colon-separated, no user-controlled text that isn't validated or hashed.
- Version cache keys when the cached shape changes (`shop:v2:product:9`), so old and new code don't read each other's values during a deploy.
- **Every cache key gets a TTL when it is written**: `SET key value EX 300`, not `SET` followed by a separate `EXPIRE` that can be skipped if the process dies. A plain `SET` without `KEEPTTL` removes an existing TTL.
- Add jitter to TTLs (for example 300 seconds plus or minus 10 percent) so keys written together don't expire together.
- Hash fields can carry their own TTL with `HEXPIRE` on Redis 7.4 and later. On older servers, expire the whole hash or use separate keys.
- In Redis Cluster, a multi-key command or transaction needs all its keys in one slot. Put the shared part in braces, `shop:{user:42}:cart` and `shop:{user:42}:wishlist`, and only for keys that are really used together, or one slot gets hot.

## 3. Caching

Default to **cache-aside**: read the cache; on a miss, read the source of truth, write the cache with a TTL, return. On a write, update the database first, then **delete** the cache key (don't write the new value into the cache from the write path, which races with concurrent readers).

Protect hot keys from a **stampede** (many requests missing at once and all hitting the database):

1. **Request coalescing in-process**: one in-flight load per key per process.
2. **A short rebuild lock**: on a miss, `SET lock:<key> <token> NX PX 5000`. The winner rebuilds; others wait briefly and re-read, or serve a stale copy.
3. **Early refresh**: store the value with a soft expiry inside it and refresh in the background shortly before the hard TTL.

Also cache "not found" for a short TTL so missing IDs don't hammer the database, and never cache errors as values. Tell the user what the staleness window is; if they need read-your-writes, the cache must be deleted in the same request that writes.

## 4. Locks

A lock in Redis is a **lease, not a guarantee**.

- Acquire: `SET lock:<resource> <random-token> NX PX <ttl-ms>`. The token is unique per acquisition.
- Release only your own lock: compare the token and delete in one atomic step, with a Lua script (`if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end`) or `DELEX key IFEQ token` on Redis 8.4 and later. Plain `DEL` can delete another client's lock.
- Replication is asynchronous, so a failover can hand the same lock to two clients. Clock jumps can too. Redlock (several independent masters) narrows this but doesn't remove it.
- If two holders at once would corrupt data or move money, **stop and tell the user**: protect the write itself with a fencing token checked by the database (a version column, `UPDATE ... WHERE version = ?`) or use the database's own locks. Use a Redis lock alone only where an occasional overlap is acceptable (deduplicating cron runs, rebuild locks).

## 5. Streams and pub/sub

- Pub/sub delivers only to subscribers connected at that moment, at most once. A disconnect loses messages.
- For jobs and events that must be processed, use a Stream: `XADD events MAXLEN ~ 100000 * field value`, a group with `XGROUP CREATE events workers $ MKSTREAM`, consumers that `XREADGROUP GROUP workers <consumer> COUNT 10 BLOCK 5000 STREAMS events >`, and `XACK` only after the work is done.
- Reclaim stuck messages from dead consumers with `XAUTOCLAIM` on a schedule, count deliveries, and move messages that keep failing to a dead-letter stream.
- Delivery is at least once, so make handlers idempotent.
- Cap every stream with `MAXLEN` or `MINID` trimming; an untrimmed stream grows until memory runs out.

## 6. Memory, eviction and persistence

Read `references/operations.md` before you change server settings. The short rules:

- Set `maxmemory` below the container or instance limit, leaving room for replication and AOF buffers.
- A pure cache uses `allkeys-lru` or `allkeys-lfu`. A store uses `noeviction` (the default) and alerts on memory. Don't mix critical keys and cache keys on one instance under a `volatile-*` policy; use two instances.
- A store needs persistence: AOF with `appendfsync everysec` loses at most about a second on a crash; add RDB snapshots for backups. A pure cache can run with neither.
- Find slow and large things with `SLOWLOG GET`, `redis-cli --bigkeys`, `redis-cli --memkeys` and `MEMORY USAGE <key>`; these are read-only.

## 7. Atomicity

- Use a single command when one exists (`INCR`, `SET NX`, `ZADD GT`, `GETDEL`).
- Use `MULTI`/`EXEC` to batch writes atomically. It doesn't roll back a failed command and can't branch on a value read inside it; use `WATCH` for optimistic check-and-set, or a Lua script or Function for read-then-write logic.
- Keep scripts short: they block every other client while they run.
- Pipeline independent commands to cut round trips; a pipeline is not atomic.

## Never

- Use Redis as the only copy of data the user can't lose, unless persistence and backups are set up and the user has agreed.
- Store secrets or personal data without a TTL and a reason.
- Call `KEYS`, `SMEMBERS`, `HGETALL` or `LRANGE 0 -1` on collections that can grow without bound in a request path.
- Retry a failed lock acquisition in a tight loop; back off with jitter.

## Report format (when reviewing)

```
Redis review: <scope>
Mode: cache | store | mixed (risk)
Findings:
1. [severity] <file:line or key pattern>: <problem> → <fix>
Settings checked: maxmemory, maxmemory-policy, appendonly/appendfsync, save
Not verified: <anything you could not run or see>
```
