---
name: pytorch-patterns
description: Writes and fixes PyTorch training code, covering nn.Module and training loop structure, device and dtype placement, DataLoader setup, torch.amp mixed precision, checkpoint save and resume, seeding for reproducibility, and tracking down NaN losses and tensor shape errors. Use when building or debugging a PyTorch model, a training or evaluation loop, or a checkpoint that will not load.
license: MIT
compatibility: Any Agent Skills host. Needs Python and PyTorch 2.x; GPU sections assume CUDA but the rules hold for CPU and MPS.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: ai
  kete-loom/risk: runs-commands
  kete-loom/requires: "python"
  kete-loom/owner: "Kete-org"
---

# PyTorch patterns

Write training code that runs the same way twice, fails loudly on bad shapes, and can resume after a crash. For how to design the experiment itself (splits, baselines, metrics), use the `ml-experiment-workflow` skill instead.

## 0. Before you write code

1. Find the PyTorch version (`python -c "import torch; print(torch.__version__)"`) and the target device. Write for that version.
2. Find the existing training entry point, config and data code. Extend them; do not start a second training script.
3. **Stop and ask the user** if the target device, the metric being optimised, or the expected input shape is unclear.

## 1. Structure

- One `nn.Module` per model. `__init__` builds layers; `forward` only computes. No data loading, logging or `.to(device)` inside `forward`.
- Keep three separate functions: `train_one_epoch(model, loader, optimizer, ...)`, `evaluate(model, loader)`, and a `main()` that wires config, data, model and checkpoints.
- Put hyperparameters in one config object (dataclass, YAML, argparse). Save it next to every checkpoint.
- Register non-trainable tensors with `self.register_buffer(...)` so they move with `.to()` and land in `state_dict`. Store sub-modules in `nn.ModuleList`/`nn.ModuleDict`, never a plain list or dict, or their parameters are invisible to the optimizer.

## 2. The training step

```python
use_amp = device.type == "cuda"
scaler = torch.amp.GradScaler("cuda", enabled=use_amp and amp_dtype == torch.float16)
model.train()
for x, y in loader:
    x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
    optimizer.zero_grad(set_to_none=True)
    with torch.amp.autocast(device_type=device.type, dtype=amp_dtype, enabled=use_amp):
        loss = criterion(model(x), y)
    scaler.scale(loss).backward()
    scaler.unscale_(optimizer)                      # only if clipping
    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm)
    scaler.step(optimizer)
    scaler.update()
    scheduler.step()                                # per-step schedulers only
```

Evaluation:

```python
model.eval()
with torch.inference_mode():
    for x, y in loader: ...
```

Rules:

- Always pair `model.train()` / `model.eval()`. Forgetting `eval()` leaves dropout on and batch norm updating running stats.
- Log `loss.item()` (or `.detach()`) not `loss`, or you keep the whole graph alive and leak memory.
- Call `scheduler.step()` after `optimizer.step()`. Decide once whether the scheduler steps per batch or per epoch and match the schedule's length to that.
- For gradient accumulation, divide the loss by the number of accumulation steps and only step/zero the optimizer every N batches.

## 3. Device and dtype

- Pick the device once: `device = torch.device("cuda" if torch.cuda.is_available() else "cpu")` (add `"mps"` if the project targets Apple silicon). Pass it down; do not call `.cuda()` in scattered places.
- Move the model to the device **before** creating the optimizer.
- Create new tensors on the right device and dtype: `torch.zeros(n, device=x.device, dtype=x.dtype)`, not `torch.zeros(n).to(...)` later.
- Classification targets for `CrossEntropyLoss` are `long` class indices of shape `(N,)` (or probabilities of shape `(N, C)`); logits are raw, no softmax first. `BCEWithLogitsLoss` takes float targets the same shape as the logits.

## 4. Data loading

- `Dataset.__getitem__` returns one sample; batching is the `DataLoader`'s job.
- Training loader: `shuffle=True`, `num_workers>0`, `pin_memory=True` on CUDA, `persistent_workers=True` when `num_workers>0`, `drop_last=True` if batch norm sees tiny last batches.
- Eval loader: `shuffle=False`, `drop_last=False`, so every sample is scored once.
- Fit normalisation statistics, vocabularies and tokenizers on the training split only.
- First debug step for a slow loop: time an epoch with the model step removed. If the loader alone is slow, fix the loader before touching the model.

## 5. Mixed precision

- Use the device-generic API: `torch.amp.autocast("cuda", dtype=...)` and `torch.amp.GradScaler("cuda")`. `torch.cuda.amp.*` is deprecated.
- `float16` needs a `GradScaler`. `bfloat16` (Ampere-class GPUs and newer, and CPU) has float32's range and is normally run without one; pass `enabled=False` to the scaler so the loop stays the same.
- Wrap only the forward pass and loss in `autocast`. Run `backward()` outside it.
- Use built-in ops for precision-sensitive maths (`log_softmax`, `cross_entropy`, `mse_loss`, `binary_cross_entropy_with_logits`): autocast runs these in float32. Hand-written `exp`/`log`/sum chains get no such protection.

## 6. Checkpoints

Save everything needed to resume, not just the weights:

```python
torch.save({
    "model": model.state_dict(), "optimizer": optimizer.state_dict(),
    "scheduler": scheduler.state_dict(), "scaler": scaler.state_dict(),
    "epoch": epoch, "step": step, "config": asdict(cfg),
    "rng": {"torch": torch.get_rng_state(), "cuda": torch.cuda.get_rng_state_all()},
}, tmp_path)
os.replace(tmp_path, path)      # atomic: a crash never leaves a half-written file
```

- Load with `torch.load(path, map_location=device)`. Since PyTorch 2.6 the default is `weights_only=True`, so a checkpoint holding custom objects fails to load. Store plain types (dicts, lists, tensors, numbers) instead, or allowlist the class with `torch.serialization.add_safe_globals([...])`. Only pass `weights_only=False` for files you created yourself.
- If the model was wrapped (`DistributedDataParallel`, `torch.compile`), save the unwrapped module's `state_dict` (`model.module` or `model._orig_mod`) so keys have no `module.` / `_orig_mod.` prefix.
- Keep the best checkpoint (by validation metric) separate from the latest one.

## 7. Reproducibility

```python
def seed_everything(seed: int):
    random.seed(seed); np.random.seed(seed); torch.manual_seed(seed)  # seeds all devices
```

- DataLoader workers: pass `generator=torch.Generator().manual_seed(seed)` and a `worker_init_fn` that seeds NumPy and `random` from `torch.initial_seed() % 2**32`.
- For bit-exact runs: `torch.use_deterministic_algorithms(True)`, `torch.backends.cudnn.benchmark = False`, and set the environment variable `CUBLAS_WORKSPACE_CONFIG=:4096:8` before CUDA starts. This costs speed; turn it on for debugging and comparisons, not by default.
- Log the seed, the git commit and the library versions with each run.

## 8. Debugging

Read `references/debugging.md` for the full NaN and shape checklists. The short version:

- **Shape errors**: print `x.shape` at each layer boundary for one batch, or assert expected shapes (`assert x.shape[1:] == (3, 224, 224), x.shape`). Watch for silent broadcasting: `(N,)` minus `(N, 1)` gives `(N, N)` without an error.
- **NaN or inf loss**: check the input batch first (`torch.isfinite(x).all()`), then the learning rate, then the loss (log of zero, division by zero), then fp16 overflow. Turn on `torch.autograd.set_detect_anomaly(True)` for one short run to find the op that produced it; it is slow, never leave it on.
- **Loss does not go down**: overfit a single batch of 2 to 32 samples. If the model can't drive loss near zero on one batch, the bug is in the model, loss or labels, not in the hyperparameters.

## Never

- Never call `model(x)` for evaluation without `model.eval()` and `inference_mode()`/`no_grad()`.
- Never apply softmax before `CrossEntropyLoss` or sigmoid before `BCEWithLogitsLoss`.
- Never `torch.load` an untrusted file with `weights_only=False`.
- Never compare runs that used different seeds, data splits or eval code without saying so.

## Report

When you change training code, end with:

```
Changed: <files and what changed>
Verified: <command run, e.g. one-batch overfit or 1-epoch smoke run, and its result>
Not checked: <e.g. multi-GPU, full-length run>
```
