# Verification methods

## Stability conditions

- Advection, explicit: Courant number `C = |u| dt / dx`. In multiple dimensions a common form is `dt * sum_i(|u_i| / dx_i) <= C_max`. The exact `C_max` depends on the scheme (first-order upwind with forward Euler: 1).
- Diffusion, forward Euler in time and second-order central in space: `r = alpha dt / dx^2 <= 1/2` in 1D. With spacings `dx, dy, dz`: `alpha dt (1/dx^2 + 1/dy^2 + 1/dz^2) <= 1/2`.
- Advection-diffusion: satisfy both, and watch the cell Peclet number `Pe = |u| dx / alpha`; central differencing of advection oscillates when `Pe > 2`.
- Crank-Nicolson is unconditionally stable for linear diffusion but can produce oscillations for large `r` with sharp initial data; backward Euler damps them at first-order accuracy.

Do a von Neumann analysis for any scheme not covered here before trusting a step size.

## Method of manufactured solutions (MMS)

1. Choose a smooth analytic function `u_m(x, t)` that exercises every term (non-zero derivatives, varying coefficients).
2. Substitute it into the governing equation `L(u) = f` to get the source `f_m = L(u_m)` (use a computer algebra system).
3. Run the code with source `f_m` and boundary/initial data taken from `u_m`.
4. Compute the error norm (L2 and L-infinity) at several resolutions; the slope on a log-log plot should match the scheme's design order.

## Observed order and Richardson extrapolation

Three solutions `f1` (finest), `f2`, `f3` (coarsest) with constant refinement ratio `r = h2/h1 = h3/h2 > 1`:

```
p      = ln( (f3 - f2) / (f2 - f1) ) / ln(r)
f_ext  = f1 + (f1 - f2) / (r^p - 1)
e_a    = | (f1 - f2) / f1 |                         # relative difference, fine pair
GCI_21 = Fs * e_a / (r^p - 1)                        # Fs = 1.25 with three grids, 3 with two
```

Check the asymptotic range: `GCI_32 / (r^p * GCI_21)` should be close to 1. If `(f3 - f2)` and `(f2 - f1)` have opposite signs the convergence is oscillatory and `p` is not meaningful; refine further. For non-constant ratios, solve for `p` iteratively.

## Time-step convergence

Repeat the same procedure on `dt` with the grid held at a fine, converged resolution. To measure the combined space-time error instead, refine `dx` and `dt` together at a fixed ratio (for example a constant Courant number) and interpret `p` as the order of the coupled scheme.

## Conservation and sanity checks

- Track integral invariants (mass, energy, momentum) over time; report drift relative to the initial value.
- Symmetric problems must give symmetric answers to round-off.
- A steady state must be independent of the initial guess.

## Sensitivity and sweeps

- One-at-a-time sweeps miss interactions; use Latin hypercube sampling or a Sobol sequence (`scipy.stats.qmc`) and compute variance-based sensitivity indices when the cost allows.
- Store each run's parameters and outputs in one table (CSV or Parquet) keyed by a run ID.
