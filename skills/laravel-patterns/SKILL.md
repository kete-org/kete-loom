---
name: laravel-patterns
description: Laravel application conventions for routes, controllers and Eloquent models, with N+1 detection through eager loading and preventLazyLoading, validation in Form Request classes, authorization through policies and gates, queued jobs that dispatch after commit, config caching and the env() trap, mass-assignment and other framework security defaults, and feature tests in Pest or PHPUnit using RefreshDatabase and fakes. Use when building or reviewing a Laravel app, fixing slow Eloquent pages, adding a policy, form request or queued job, or writing Laravel feature tests.
license: MIT
compatibility: Any Agent Skills host. Needs PHP, Composer and the project's artisan command. Written for Laravel 11 and later; most rules also apply to 9 and 10.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "php, composer"
  kete-loom/owner: "Kete-org"
---

# Laravel patterns

Write Laravel code the way the framework expects, so the next developer finds things where Laravel puts them. For plain PHP language style (types, enums, PSR-12) follow the `php-patterns` skill; for PHPUnit or Pest mechanics outside Laravel follow `php-testing`.

## 0. Before you change anything

1. Read `composer.json` for the `laravel/framework` version and whether `pestphp/pest` is installed. Match the project, not this skill, where they differ.
2. Check the layout: Laravel 11+ apps configure middleware, exceptions and routing in `bootstrap/app.php` and have no `Http/Kernel.php`. Older apps use the kernel. Do not mix the two styles.
3. Run the test command (`php artisan test`, or `./vendor/bin/pest` / `./vendor/bin/phpunit`). If it fails before you start, **stop and tell the user**.

## 1. Structure

- Routes stay thin: `routes/web.php` and `routes/api.php` map URLs to controllers. No business logic in route closures beyond trivial pages.
- Controllers: one resource controller per model (`php artisan make:controller PostController --resource --model=Post`). A controller method does: authorize, validate, call the domain code, return a response.
- Put multi-step business logic in an action or service class under `app/` (for example `app/Actions/PublishPost.php`) injected through the constructor. Do not invent a repository layer over Eloquent unless the project already has one.
- Use route model binding (`Post $post`) instead of `Post::findOrFail($id)` in the controller. Scope child bindings with `->scopeBindings()` so `/users/{user}/posts/{post}` can't load another user's post.
- Return API data through API resources (`php artisan make:resource PostResource`), never `$model->toArray()` straight from the database, so new columns don't leak.

## 2. Eloquent and N+1

1. Turn lazy loading into an error outside production, in `AppServiceProvider::boot()`:
   ```php
   Model::preventLazyLoading(! $this->app->isProduction());
   ```
   Then every N+1 shows up as a `LazyLoadingViolationException` in tests and local runs.
2. Load relations before the loop: `Post::with(['author', 'tags'])->paginate()`. On an already loaded collection use `$posts->load('author')`. For counts use `withCount('comments')`, not `$post->comments->count()`.
3. Select only what the page needs on wide tables (`->select(['id', 'title', 'user_id'])`), keeping the foreign keys the eager loads need.
4. Large batch work: `chunkById(500, ...)` or `lazyById()`, never `Model::all()` on a table that grows.
5. Writes that touch many rows: `Post::where(...)->update([...])` runs one query but skips model events and observers. Say so if the code relies on them.
6. Wrap multi-write operations in `DB::transaction(function () { ... })`.
7. Index every column you filter, join or sort on, in the same migration that adds the query.

## 3. Validation with Form Requests

- Any input with more than a couple of rules gets a Form Request: `php artisan make:request StorePostRequest`. Type-hint it in the controller; Laravel validates before the method runs.
- Persist only `$request->validated()` (or `$request->safe()->only([...])`). Never `$request->all()` into `create()` or `update()`.
- `make:request` generates `authorize()` returning `false`, which turns every request into a 403. Return the policy check there (`return $this->user()->can('update', $this->route('post'));`), or delete the method and authorize in the controller; never leave both with different logic.
- Use rule objects for real rules: `Rule::unique('users')->ignore($user)`, `Rule::exists('teams', 'id')`, `Rule::enum(Status::class)`, `Password::defaults()`.
- Validate files with `file`, `mimes:` and `max:` (kilobytes). Never trust the client file name; store with `store()` and a generated name.

## 4. Authorization: policies and gates

- One policy per model: `php artisan make:policy PostPolicy --model=Post`. Policies in `app/Policies` named `<Model>Policy` are discovered automatically.
- Authorize in every action that reads or changes a specific record:
  ```php
  Gate::authorize('update', $post);           // throws, becomes 403
  Route::put('/posts/{post}', ...)->can('update', 'post');
  ```
  `$this->authorize()` in a controller only exists if the base controller uses the `AuthorizesRequests` trait; the Laravel 11+ skeleton's base controller does not, so prefer `Gate::authorize`.
- Gates (`Gate::define` in `AppServiceProvider`) are for actions without a model, such as viewing an admin dashboard.
- Return `Response::denyAsNotFound()` from a policy when a 403 would reveal that the record exists.
- Hiding a button in Blade with `@can` is not authorization. The controller check is.

## 5. Queues and jobs

1. `php artisan make:job SendInvoice`; implement `ShouldQueue`. Pass models or IDs, not large payloads; `SerializesModels` reloads the model when the job runs.
2. Dispatch after the database commit when the job reads rows you just wrote: `SendInvoice::dispatch($invoice)->afterCommit()`, or set `after_commit` to `true` on the queue connection in `config/queue.php`.
3. Make every job safe to run twice. Set `$tries`, `$backoff` and `$timeout`, check state before acting, and use `ShouldBeUnique` or `WithoutOverlapping` middleware where duplicates hurt.
4. Implement `failed(Throwable $e)` for anything the user is waiting on, so a failure is recorded, not lost.
5. Production runs a real driver (redis, database, SQS) with a supervised `php artisan queue:work`; `sync` is for tests only. Run `php artisan queue:restart` on deploy so workers load new code.

## 6. Config and environment

- Read `env()` **only** inside `config/*.php`. After `php artisan config:cache`, `env()` elsewhere returns `null`. Application code uses `config('services.stripe.secret')`.
- `.env` is never committed. Add every new key to `.env.example` with a placeholder.
- Production: `APP_DEBUG=false`, `APP_ENV=production`, a set `APP_KEY`, and `php artisan optimize` (config, route, event and view caches) in the deploy.

## 7. Security defaults to keep

- Mass assignment: declare `$fillable` (or a narrow `$guarded`) on every model. Never `$guarded = []` on models that take user input. Consider `Model::preventSilentlyDiscardingAttributes()` outside production.
- Blade `{{ }}` escapes; `{!! !!}` does not. Use `{!! !!}` only for HTML you sanitised yourself.
- Raw SQL: `DB::select('... where id = ?', [$id])` or `whereRaw('x = ?', [$v])`. Never interpolate input into `whereRaw`, `orderByRaw` or column names; whitelist sortable columns.
- Keep CSRF protection on web routes. Exclude only webhook routes that verify their own signature.
- Hash passwords with `Hash::make` (or the `hashed` cast). Rate-limit login and API routes with `RateLimiter::for` and the `throttle` middleware.
- Signed URLs (`URL::temporarySignedRoute`) for one-off links; check `hasValidSignature()` or use the `signed` middleware.

## 8. Testing (Pest or PHPUnit)

Use whichever the project has. Feature tests hit routes; unit tests cover plain classes.

```php
uses(RefreshDatabase::class);

it('lets the owner update a post', function () {
    $post = Post::factory()->create();

    $this->actingAs($post->author)
        ->put(route('posts.update', $post), ['title' => 'New'])
        ->assertRedirect();

    expect($post->fresh()->title)->toBe('New');
});

it('forbids other users', function () {
    $post = Post::factory()->create();
    $this->actingAs(User::factory()->create())
        ->put(route('posts.update', $post), ['title' => 'x'])
        ->assertForbidden();
});
```

- Build data with model factories and states, not hand-written inserts.
- Fake side effects: `Queue::fake()`, `Bus::fake()`, `Mail::fake()`, `Notification::fake()`, `Event::fake()`, `Storage::fake('s3')`, `Http::fake([...])` plus `Http::preventStrayRequests()`.
- Every policy gets an allowed and a forbidden test. Every Form Request gets at least one invalid-input test asserting `assertSessionHasErrors` or `assertUnprocessable()`.
- Freeze time with `$this->travelTo(...)` or `Carbon::setTestNow()` for anything date-based.

## Stop and ask the user

- Before a migration that drops or renames a column or table with data, or rewrites a large table.
- Before changing the queue driver, cache store, session driver or auth guard.
- Before adding a Composer package for something Laravel already does.

## Never

- Never commit `.env`, `APP_KEY` or credentials, or set `APP_DEBUG=true` in production.
- Never call `env()` outside `config/`.
- Never pass `$request->all()` to `create`, `update` or `fill`.
- Never skip the policy check because "the UI hides it".
- Never run `migrate:fresh` or `db:wipe` against anything but a local or test database.

## Finish

Run the test command and `php artisan route:list` if routes changed. Report: files changed, N+1s found and fixed, authorization added, and anything you could not test.
