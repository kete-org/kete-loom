---
name: angular-patterns
description: Modern Angular guidance for standalone components, signal state with input(), output(), model(), computed and effect, RxJS subscriptions that cannot leak, OnPush and zoneless change detection, inject()-based dependency injection, typed reactive or signal forms, and TestBed component tests. Use when writing, migrating or debugging an Angular application, such as moving NgModules to standalone, replacing decorators with signals, fixing a view that does not refresh, or stopping a subscription leak.
license: MIT
compatibility: Any Agent Skills host. Targets Angular 17+ and notes where v20, v21 and v22 changed defaults. Needs the Angular CLI (ng) to build and test.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "ng"
  kete-loom/owner: "Kete-org"
---

# Angular patterns

Write Angular that uses signals for state, RxJS for streams, and lets change detection do as little as possible. Match the version the project is on; do not introduce APIs it does not have.

## 0. Orient first

1. Read `package.json` for the `@angular/core` major. Read `angular.json` for the builder and test runner (Vitest, Karma or Jest).
2. Check `main.ts` / `app.config.ts`: `bootstrapApplication` means standalone; `provideZonelessChangeDetection()` or no `zone.js` in `polyfills` means zoneless.
3. Know the default shifts:
   - Standalone is the default for components, directives and pipes since v19.
   - New apps are zoneless by default since v21, and new projects use Vitest.
   - From v22, components without a `changeDetection` setting are OnPush; the old default is named `ChangeDetectionStrategy.Eager`.
4. Run the CLI migrations instead of rewriting by hand when moving a codebase: `ng generate @angular/core:standalone`, `@angular/core:control-flow`, `@angular/core:signal-input-migration`, `@angular/core:inject`. Review their diff.

## 1. Components

```ts
@Component({
  selector: 'app-user-card',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (user(); as u) { <h2>{{ u.name }}</h2> } @else { <p>Loading</p> }
    @for (tag of tags(); track tag.id) { <span>{{ tag.label }}</span> } @empty { <p>No tags</p> }
  `,
})
export class UserCard {
  user = input.required<User>();
  tags = input<Tag[]>([]);
  selected = output<string>();
  expanded = model(false);
  initials = computed(() => this.user().name.slice(0, 2).toUpperCase());
}
```

- Use built-in control flow (`@if`, `@for`, `@switch`) over `*ngIf`/`*ngFor` in new code. `@for` requires `track`: use a stable id, `$index` only for static lists.
- Set `OnPush` explicitly on versions before v22 so behaviour is the same after upgrade.
- Keep templates free of method calls that compute; use `computed` or a pure pipe.
- Use `@defer` for heavy below-the-fold components.

## 2. Signals

- `signal()` for local state, `computed()` for anything derived, `input()`/`model()` for component inputs.
- Update with `.set()` or `.update(v => ...)`. Never mutate an object inside a signal in place; produce a new object or the change is not seen.
- `effect()` is for syncing to the outside world (localStorage, logging, a non-Angular widget). Do not use it to copy one signal into another; use `computed`, or `linkedSignal` when the derived value must also be writable.
- For async data, prefer `resource()` / `httpResource()` (stable in v22; check status on older versions) or `toSignal(observable$)` over manual subscribe-and-set.
- Bridge with `toSignal` and `toObservable` from `@angular/core/rxjs-interop`. `toSignal` needs an injection context and an `initialValue` unless you handle `undefined`.

## 3. RxJS without leaks

Every `subscribe()` needs a teardown. In order of preference:

1. Do not subscribe: use the `async` pipe or `toSignal`.
2. `takeUntilDestroyed()` in a constructor or field initialiser, or `takeUntilDestroyed(this.destroyRef)` elsewhere.
3. Explicit `Subscription` cleaned in `DestroyRef.onDestroy`.

Rules:

- No nested `subscribe` inside `subscribe`. Use `switchMap` (cancel previous, for search and route params), `concatMap` (keep order, for writes), `exhaustMap` (ignore while busy, for submit buttons) or `mergeMap` (parallel).
- `HttpClient` calls complete on their own, but long-lived sources (`valueChanges`, router events, `interval`, websockets, store selects) never do.
- Handle errors with `catchError` inside the inner observable so one failure does not kill the outer stream.
- Use `shareReplay({ bufferSize: 1, refCount: true })` for shared HTTP results, not bare `shareReplay(1)` on infinite sources.

## 4. Change detection

- With OnPush or zoneless, a view refreshes when a signal it reads changes, an input reference changes, a template event fires, or the `async` pipe emits. Setting a plain field from a `setTimeout` or a third-party callback does not refresh the view: make that field a signal.
- Never fix a stale view with `ChangeDetectorRef.detectChanges()` sprinkled in callbacks, or `setTimeout(() => ...)`. Convert the state to a signal.
- `ExpressionChangedAfterItHasBeenCheckedError` means a value changes during the check; move the write into a `computed`, an event handler, or `afterNextRender`.
- Run DOM-measuring or browser-only code in `afterNextRender` / `afterEveryRender`, which do not run on the server.

## 5. Dependency injection

- Use `inject(Service)` in field initialisers; constructor injection is still valid in codebases that use it.
- `@Injectable({ providedIn: 'root' })` for app-wide singletons. Provide per-feature services in route `providers` or a component's `providers` when each instance needs its own state.
- Use `InjectionToken<T>` for config values, provided in `app.config.ts`.
- `inject()` only works in an injection context; outside one, pass an `Injector` and use `runInInjectionContext`.
- Use functional guards, resolvers and interceptors (`CanActivateFn`, `HttpInterceptorFn` with `provideHttpClient(withInterceptors([...]))`).

## 6. Forms

- Use typed reactive forms (`FormBuilder.nonNullable.group`, `FormControl<string>`) for new forms on versions before v22. Avoid `UntypedFormGroup` in new code.
- On v22+, signal forms (`form()` with the `[formField]` directive) are stable; use them for new forms if the codebase has adopted them, and do not mix both styles inside one form.
- Put validation in validators, not in submit handlers. Show errors from the control's state (`invalid && touched`).
- Disable the submit button while pending and use `exhaustMap` (or a pending signal) to stop double submits.

## 7. Tests

1. Run the project's test command (`ng test`, which uses Vitest in new v21+ projects or Karma in older ones). Do not switch runners as a side effect.
2. Standalone components: `TestBed.configureTestingModule({ imports: [UserCard] })`, then `const fixture = TestBed.createComponent(UserCard)`.
3. Set signal inputs with `fixture.componentRef.setInput('user', user)`, then `await fixture.whenStable()` (or `fixture.detectChanges()` in zone-based tests).
4. Use `provideHttpClient()` plus `provideHttpClientTesting()` and `HttpTestingController` to assert requests; call `httpMock.verify()` after each test.
5. Query by role, text or `data-testid`, and assert what the user sees.

## Stop and ask the user

- Moving the app from zone.js to zoneless, or from Karma to Vitest.
- A migration schematic touches more than the files you were asked to change.
- Upgrading the Angular major is the simplest fix.

## Never

- Never leave a `subscribe()` on a long-lived observable without teardown.
- Never mutate inputs or objects held in signals in place.
- Never call `detectChanges()` or `setTimeout` to paper over a state that is not reactive.
- Never bypass sanitisation with `bypassSecurityTrustHtml` on user content.

## Report back

List the files changed, the Angular version assumptions you relied on, the build and test commands you ran with their results, and any migration left for later.
