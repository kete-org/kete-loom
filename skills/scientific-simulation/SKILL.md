---
name: scientific-simulation
description: Numerical simulation discipline for physics, chemistry, materials and engineering codes - checking stability limits such as the CFL and explicit diffusion conditions, choosing explicit or implicit time stepping and linear or nonlinear solvers with stated tolerances, running grid and time-step convergence studies with observed order and Richardson extrapolation, keeping code verification against analytic or manufactured solutions separate from validation against experiment, planning parameter sweeps, and making runs and post-processing reproducible. Use when writing or debugging a PDE, ODE, finite-difference, finite-volume, finite-element, molecular dynamics or phase-field simulation, when a simulation blows up or results change with resolution, or when results need defending in a paper or design review.
license: MIT
compatibility: Any Agent Skills host. Language-agnostic; examples assume Python with NumPy and SciPy but the rules apply to Fortran, C++, Julia or MATLAB codes.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: data
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Scientific simulation

A simulation result is only as good as the evidence that the numbers come from the equations (verification) and that the equations describe the system (validation). This skill makes that evidence part of the work, not an afterthought.

## Ground rules

1. **Write down the model first**: equations, domain, boundary and initial conditions, material parameters with units and sources, and the quantity of interest (QoI) you will report.
2. **Units are explicit and consistent.** One unit system per code; convert at the boundaries. Non-dimensionalise when it clarifies which parameters matter.
3. **Stability before accuracy.** Compute the stability limit for every explicit scheme and pick the step from it, not by trial.
4. **Verification and validation are different claims.** Verification: the code solves the equations correctly (compare with analytic or manufactured solutions, check convergence order). Validation: the equations match reality (compare with experiment, with stated uncertainty). Never call agreement with experiment "verification".
5. **No result without a convergence study.** Report the QoI at three or more resolutions with the observed order and an error estimate.
6. **Reproducible runs.** Every run records code version (commit hash), input file, parameters, random seed, library versions, hardware and wall time. Post-processing is a script that reads raw output, never hand edits.

## Stability and step size

| Scheme | Condition (1D, uniform grid) |
|---|---|
| Explicit advection | Courant number `C = |u| dt / dx <= C_max`, typically `C_max = 1` for simple explicit schemes; check your scheme's own limit |
| Explicit diffusion (forward Euler, central space) | `alpha dt / dx^2 <= 1/2`; in d dimensions with equal spacing, `<= 1/(2d)` |
| Stiff ODEs or reaction terms | Explicit steps limited by the fastest timescale; switch to an implicit or IMEX method (for example SciPy `solve_ivp(method="BDF")` or `"Radau"`) |
| Molecular dynamics | Time step a small fraction of the fastest vibration period; monitor total energy drift in NVE |

Implicit methods remove the stability limit for linear problems but not the accuracy limit: a large step still smears transients. Derivations and multi-dimensional forms are in `references/verification-methods.md`.

## Solver choice

- Linear systems: direct (sparse LU) for small or ill-conditioned 2D problems; preconditioned Krylov (CG for symmetric positive definite, GMRES or BiCGStab otherwise) for large ones. State the tolerance and check the true residual, not just the solver's exit flag.
- Nonlinear systems: Newton with a line search or trust region; report iteration counts and residual history. Set nonlinear tolerances tighter than the discretisation error you expect.
- Never loosen a tolerance to make a run finish without recording it.

## Steps

1. **Specify** the model per rule 1 and write it at the top of the input or a README.
2. **Pick the scheme and step** from the stability table; print `C` or the diffusion number at startup and stop the run if it exceeds the limit.
3. **Verify the code** on a case with a known answer: an analytic solution, or the method of manufactured solutions (choose a solution, derive the source term, check the error falls at the scheme's design order). Do this before any production run, and again after changing the discretisation.
4. **Convergence study** on the real problem: refine the grid by a constant ratio (2 is common) at least three times, holding everything else fixed; repeat for the time step. Compute the observed order and the Richardson-extrapolated value, and report the grid convergence index (`references/verification-methods.md`). If the observed order is far from the design order, the solution is not in the asymptotic range or there is a bug; refine further or debug, do not report.
5. **Validate** against experimental data where it exists: compare QoIs with both numerical and experimental uncertainty shown, and say which parameters were calibrated on which data. Calibrating and validating on the same data is not validation.
6. **Parameter sweeps**: define ranges and sampling (grid, Latin hypercube, or Sobol for sensitivity) up front, run each point at a resolution already shown to be converged, and keep failed runs in the results table with their failure mode.
7. **Post-process** from raw outputs with a script; plots show units, resolution and error bars.
8. **Report** in the format below.

## Diagnosing a run that blows up

Check in this order: the stability number at the failing step; units and parameter magnitudes; boundary conditions (sign, type, corner treatment); initial conditions that violate constraints; mesh quality (aspect ratio, inverted elements); solver tolerance and divergence messages; then floating-point issues (catastrophic cancellation, denormals). Reproduce on the smallest grid that still fails.

## Stop and ask the user

- Before quoting results for a safety-critical design (structures, pressure systems, medical devices, nuclear): this skill does not replace code-qualified analysis or review by a qualified engineer.
- When material or physical parameters lack a source.
- When converged results disagree with experiment beyond uncertainty: the choice of model change is the scientist's, not the agent's.

## Never

- Report a single-resolution result as final.
- Tune numerical parameters (step, damping, tolerance) to match experiment.
- Delete or hide runs that failed or diverged.

## Report format

```
Model: <equations, domain, BCs/ICs, parameter sources>
Numerics: <discretisation, time stepping, solver, tolerances, stability number used>
Verification: <case, error norm, observed order vs design order>
Convergence: <QoI at h1/h2/h3, observed order p, extrapolated value, GCI>
Validation: <data source, comparison with uncertainties> | not available
Sweep: <parameters, ranges, sampling, n runs, failures>
Reproducibility: <commit, inputs, seeds, environment>
Limits: <what the results do not show>
```
