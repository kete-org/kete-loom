---
name: production-scheduling
description: Production and job-shop scheduling for factories, print shops, kitchens and other work centres, covering capacity checks, finding the bottleneck, dispatching rules such as SPT, EDD and Johnson's rule, sequence-dependent changeovers, time and WIP buffers, rescheduling after a breakdown or rush order, and when to move from heuristics to a constraint solver like OR-Tools CP-SAT. Use when building or fixing a production schedule or scheduling tool, deciding job order across machines or lines, or replanning after a disruption.
license: MIT
compatibility: Any Agent Skills host. Works in a spreadsheet or code; the solver path assumes Python with the ortools package, installed only if the user agrees.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: business
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Production scheduling

Produce a schedule that is feasible first (capacity, routing, calendars), good second (the user's objective), and stable third (small changes when something breaks).

## 0. Model the shop, or stop and ask

Collect:

1. **Jobs**: ID, product, quantity, release date (material available), due date, priority.
2. **Routings**: ordered operations per product, which machine or machine group each can run on, run time per unit, setup time.
3. **Resources**: machines, lines, people with skills, tooling; shift calendars, planned maintenance.
4. **Changeovers**: setup matrix from product family to product family if setups depend on sequence.
5. **Objective**: on-time delivery (minimise lateness or late jobs), throughput (minimise makespan), or cost (minimise changeovers or overtime). If more than one, ask for the order of priority.

If the objective or the routing data is missing, **stop and ask the user**. A schedule optimised for the wrong goal looks fine and fails on the floor.

## 1. Check capacity before sequencing

- Load per resource per period = sum of (setup + run time) of operations assigned there. Compare with available hours from the calendar after maintenance and expected downtime.
- Any resource above ~85 to 90% load will queue badly; any above 100% makes the due dates impossible. Report it now: options are overtime, alternate routing, outsourcing, splitting lots or moving due dates. The user decides.
- The **bottleneck** is the resource with the highest load. Its schedule sets the plant's output.

## 2. Pick a method

| Situation | Method |
|---|---|
| One machine or one bottleneck dominates | Sequence that resource with a dispatching rule, then schedule others around it |
| Two machines in series, same order for all jobs | Johnson's rule (optimal for makespan) |
| Many jobs, real-time dispatch on the floor | Priority rules at each machine when it frees up |
| Sequence-dependent setups matter | Group by family (campaigns), then order families to minimise total changeover |
| Many machines, alternative routings, hard constraints, tens to thousands of operations | Constraint solver (section 4) |

Dispatching rules and what they are good for:
- **SPT** (shortest processing time first): minimises average flow time and WIP on a single machine; can starve long jobs.
- **EDD** (earliest due date first): minimises maximum lateness on a single machine.
- **Critical ratio** (time to due / remaining work): balances urgency and work left; recompute at each dispatch.
- **FIFO**: fair and simple, ignores due dates.
- **Moore-Hodgson** (add jobs in EDD order; whenever the last added job is late, remove the longest job scheduled so far and put it at the end): minimises the number of late jobs on one machine.

Johnson's rule: list jobs with times on M1 and M2. Repeatedly take the smallest remaining time; if it is on M1, put that job as early as possible; if on M2, as late as possible.

## 3. Changeovers and buffers

- Build the setup matrix; sequence light to dark, small to large, or by tooling family as the shop does. Big batches cut setups but raise WIP and lateness; show the trade-off.
- Protect the bottleneck (drum-buffer-rope): a time buffer of work queued before it so it never starves, release material at the bottleneck's pace, and keep non-bottleneck resources free to catch up.
- Add buffers before due dates for high-risk jobs rather than padding every operation.

## 4. Solver path

Use when heuristics break the constraints or the user needs a provably better plan. With OR-Tools CP-SAT (Python, `pip install ortools`, ask first):

Current releases use snake_case names (older code shows the CamelCase aliases, such as `NewIntervalVar`); confirm against the installed `cp_model` module.

1. One `new_interval_var` per operation (start, size, end); for alternative machines, one `new_optional_interval_var` per machine with its own Boolean presence literal, and `add_exactly_one` over those literals.
2. `add_no_overlap` per machine over its intervals.
3. Precedence: `end(op_k) <= start(op_k+1)` in each routing; release dates as lower bounds on start.
4. Calendars: block non-working time with fixed intervals in the machine's no-overlap set.
5. Sequence-dependent setups: use `add_circuit` over the jobs on a machine with setup-time arcs, or a simpler family-level model.
6. Objective: makespan (`add_max_equality`), weighted tardiness (`max(0, end - due)`), or a weighted sum. Set a time limit (`solver.parameters.max_time_in_seconds`); if the status is `FEASIBLE` rather than `OPTIMAL`, report the gap between `solver.objective_value` and `solver.best_objective_bound`.
7. Validate the solution independently: no overlaps, precedence held, calendars respected.

Keep a heuristic schedule as the fallback and as a sanity check; if the solver is worse on the objective, the model is wrong.

## 5. Rescheduling on disruption

Breakdown, late material, rush order, absent operator:

1. Freeze what is running and a short frozen window (for example the current shift) unless the user says otherwise.
2. Right-shift affected operations as the default; it keeps the plan recognisable.
3. Re-optimise only the unfrozen part if lateness grows past a threshold, adding a penalty for moving jobs between machines to keep stability.
4. Report which jobs moved, new due-date risk, and what the user must tell customers.

## Rules

- Never schedule beyond a resource's calendar or ignore a precedence to make the plan look on time.
- Never quietly move a committed due date; flag it for the user.
- Never write a schedule into an MES or ERP without the user's confirmation.
- Do not claim optimality from a heuristic; say which rule was used.

## Report

```
resource | job | operation | start | end | setup | due | lateness
```

Then: objective value (makespan, late jobs, total tardiness, total setup time), bottleneck load %, infeasibilities found, assumptions, and for a reschedule the list of changed jobs.
