# PyTorch debugging checklists

Read this when a run produces NaN/inf, a shape error, or a loss that will not move.

## NaN or inf loss

Work top to bottom and stop at the first thing that is wrong.

1. **Inputs.** For the failing batch: `torch.isfinite(x).all()`, `x.min()`, `x.max()`. Missing values in tabular data, empty images and divide-by-zero in preprocessing are the most common cause.
2. **Labels.** Class indices must be in `[0, num_classes)`. An out-of-range label on CUDA often shows as a device-side assert; rerun on CPU, or with `CUDA_LAUNCH_BLOCKING=1`, to get a readable traceback.
3. **Learning rate.** Drop it by 10x. If the NaN disappears, add warmup or gradient clipping (`clip_grad_norm_`) rather than keeping the smaller rate blindly.
4. **Loss maths.** Replace hand-written `log(softmax(x))` with `log_softmax` or the built-in loss; add `eps` to denominators and to `sqrt`/`log` arguments.
5. **Mixed precision.** Rerun with autocast disabled. If fp32 is stable, switch to bfloat16 or check that the `GradScaler` is used and that its scale is not collapsing (`scaler.get_scale()`).
6. **Find the op.** Wrap one short run in `torch.autograd.set_detect_anomaly(True)`; the error names the backward op that produced the NaN. Or register forward hooks that assert `torch.isfinite(output).all()` per module.

## Shape errors

1. Print the shapes at the error line, and the shapes of the inputs to the module that raised it.
2. Check the layer's expected layout: `Conv2d` wants `(N, C, H, W)`, `nn.Linear` acts on the last dimension, `nn.LSTM`/`nn.MultiheadAttention` default to `batch_first=False` (`(T, N, E)`).
3. A `Linear` input-size mismatch after a conv stack: compute it from a dummy forward (`model.features(torch.zeros(1, *input_shape)).shape`) or use `nn.LazyLinear`.
4. **Silent broadcasting.** These run without error and give wrong numbers:
   - `pred` of shape `(N, 1)` with `target` of shape `(N,)` in `MSELoss` or arithmetic: result is `(N, N)`. PyTorch warns for `MSELoss`; it does not warn for plain arithmetic.
   - `x.sum()` or `x.mean()` without `dim=` collapsing the batch.
   - `view` after `permute`/`transpose` on a non-contiguous tensor raises; `reshape` silently copies. Neither is wrong, but a `view(N, -1)` over the wrong axis order scrambles data. Check with a small hand-made tensor.
5. Add shape asserts at module boundaries in the fixed code, so the next regression fails loudly.

## Loss does not decrease

1. Overfit one small batch for a few hundred steps. Failure means a bug, not tuning.
2. Check the optimizer sees the parameters: `sum(p.numel() for g in optimizer.param_groups for p in g["params"])` equals the model's trainable count.
3. Check gradients flow: after `backward()`, every trainable parameter has a non-None, non-zero `.grad`. A `None` grad usually means a `.detach()`, `.item()`, `torch.no_grad()` or a NumPy round-trip broke the graph.
4. Check `optimizer.zero_grad()` is called each step, and that `requires_grad` is not off on layers you meant to train.
5. Check the labels line up with the inputs (shuffle applied to one but not the other, off-by-one in a sequence target).

## Out of memory

1. Log `torch.cuda.max_memory_allocated()` per step.
2. Look for tensors kept across steps: accumulating `loss` instead of `loss.item()`, appending outputs to a list during training.
3. Then reduce batch size with gradient accumulation, enable mixed precision, or use activation checkpointing (`torch.utils.checkpoint.checkpoint`).
