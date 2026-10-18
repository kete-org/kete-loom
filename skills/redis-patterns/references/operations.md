# Redis operations reference

Read this before changing `maxmemory`, eviction or persistence settings. Confirm every setting against the server's own `redis.conf` and the redis.io docs for its version; managed services (ElastiCache, Memorystore, Azure Cache, Upstash, Redis Cloud) expose only some of these, through their own console or parameter groups.

## Inspect first (read-only)

```
redis-cli INFO server        # version, mode
redis-cli INFO memory        # used_memory, maxmemory, mem_fragmentation_ratio, mem_not_counted_for_evict
redis-cli INFO stats         # keyspace_hits, keyspace_misses, evicted_keys, expired_keys
redis-cli INFO persistence   # rdb_last_bgsave_status, aof_enabled, aof_last_write_status
redis-cli CONFIG GET maxmemory*
redis-cli CONFIG GET appendonly
redis-cli CONFIG GET save
redis-cli SLOWLOG GET 20
redis-cli --bigkeys          # samples with SCAN, safe on a live server but adds load
redis-cli --memkeys
```

Hit rate: `keyspace_hits / (keyspace_hits + keyspace_misses)`. A low hit rate with high `evicted_keys` means memory is too small or the policy is wrong. A low hit rate with high `expired_keys` means TTLs are too short.

## maxmemory

- `maxmemory 0` means no limit on 64-bit builds. In a container, that means the kernel kills Redis instead of Redis evicting keys.
- Replication and AOF buffers are not counted toward `maxmemory`. Leave headroom: a common starting point is 70 to 80 percent of the memory available to the process, then adjust using `mem_not_counted_for_evict`.
- A fork for `BGSAVE` or AOF rewrite uses copy-on-write memory; on a write-heavy instance, the peak can approach double the dataset.

## maxmemory-policy

| Policy | Evicts | Use for |
|---|---|---|
| `noeviction` (default) | nothing; writes that need memory fail with an OOM error | stores, queues, anything that must not lose keys |
| `allkeys-lru` | least recently used, any key | general cache (good default) |
| `allkeys-lfu` | least frequently used, any key | cache with a stable hot set |
| `allkeys-random` | random | uniform access |
| `volatile-lru` / `volatile-lfu` / `volatile-random` | only keys with a TTL | mixed instance (prefer two instances) |
| `volatile-ttl` | keys with the shortest remaining TTL | app assigns short TTLs to cheap keys |

Recent Redis 8 releases add `allkeys-lrm` and `volatile-lrm` (least recently modified); check the redis.io eviction docs and release notes for the server version before using them. `volatile-*` policies behave like `noeviction` when no key has a TTL.

## Persistence

| Setting | Meaning |
|---|---|
| `appendonly yes` | write every change to the AOF |
| `appendfsync everysec` | fsync once a second: lose at most about a second on power loss (usual choice) |
| `appendfsync always` | fsync every write: safest, slowest |
| `appendfsync no` | let the OS decide |
| `save <seconds> <changes>` | RDB snapshot rules; `save ""` disables snapshots |

- Store: AOF `everysec` plus RDB snapshots copied off the host for backups. Test a restore.
- Cache: persistence optional. Without it, a restart starts cold, so plan for the load on the database.
- Check `rdb_last_bgsave_status` and `aof_last_write_status` are `ok` after any change.

## Latency checklist

1. `SLOWLOG GET`: look for `KEYS`, `HGETALL`/`SMEMBERS` on large keys, long Lua scripts, `DEL` on big keys.
2. `--bigkeys`: split or page anything huge; use `UNLINK` to delete.
3. Network: round trips dominate small commands; pipeline or use multi-key commands.
4. Connections: one shared client or pool per process, not a new connection per request. Check `INFO clients` for `connected_clients` climbing.
5. Fork pauses: `INFO stats` `latest_fork_usec`; large datasets fork slowly.
