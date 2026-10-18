---
name: rails-patterns
description: Ruby on Rails application work that follows the framework's conventions - fat-enough models and thin controllers, Active Record queries without N+1 (includes, preload, strict_loading), strong parameters with params.expect or require/permit, Active Job enqueued after commit, zero-downtime migrations, encrypted credentials, Turbo Frames and Streams, and Rails tests for models, requests, jobs and system flows. Use when building or reviewing a Rails app, fixing slow Active Record pages, writing a migration for a busy table, adding a background job or Hotwire form, or storing secrets in Rails credentials.
license: MIT
compatibility: Any Agent Skills host. Needs Ruby, Bundler and the project's bin/rails. Written for Rails 7.1 and later; Rails 8 specifics are marked.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/requires: "ruby, bundle"
  kete-loom/owner: "Kete-org"
---

# Rails patterns

Put code where Rails expects it and let the conventions do the work. For plain Ruby style (objects, Enumerable, RuboCop) follow the `ruby-patterns` skill; for RSpec or Minitest mechanics in depth follow `ruby-testing`.

## 0. Before you change anything

1. Read `Gemfile.lock` for the `rails` version, the database adapter, the job backend (Solid Queue, Sidekiq, GoodJob) and whether tests are RSpec (`spec/`) or Minitest (`test/`).
2. Run the suite (`bin/rails test` or `bundle exec rspec`). If it fails before you start, **stop and tell the user**.
3. Check `db/schema.rb` (or `structure.sql`) for the tables you touch, their indexes and row counts if the user can tell you.

## 1. Conventions

- Controllers are RESTful: `index show new create edit update destroy`. A new verb usually means a new resource (`resource :publication` with `create`/`destroy`), not a custom action.
- A controller action: find the record scoped to the current user, authorize, call the model or a plain object in `app/models` or `app/services`, then render or redirect.
- Scope lookups through the owner: `current_user.projects.find(params[:id])`, never `Project.find(params[:id])` for user-owned data.
- Callbacks only for the record's own consistency (normalising, defaults). Side effects (emails, API calls, other aggregates) go in explicit code or `after_commit` jobs, not `before_save`.
- Use `normalizes :email, with: ->(e) { e.strip.downcase }` (Rails 7.1+) instead of hand-written callbacks.

## 2. Active Record queries and N+1

1. Turn N+1s into errors in development and test: `config.active_record.strict_loading_by_default = true` in those environments, or `.strict_loading` on a relation / `strict_loading!(mode: :n_plus_one_only)` on a record. On an existing app the global setting can fail many tests at once, so ask before turning it on and start per model or relation. Add the `bullet` gem only if the project already uses it.
2. Load associations before iterating:
   - `includes(:author)`: Rails picks preload or a join.
   - `preload(:tags)`: separate queries; use for has_many.
   - `eager_load(:author)`: one LEFT JOIN; required when you filter or order on the association.
3. Counts: `counter_cache: true` or `left_joins(:comments).group(:id).select("posts.*, COUNT(comments.id) AS comments_count")`. Never `post.comments.count` inside a loop.
4. Existence: `exists?` (or `any?` / `empty?`, which query without loading), never `present?` or `blank?` on an unloaded relation; those load every row.
5. Batches: `find_each` / `in_batches` for anything that grows; never `Model.all.each`.
6. `pluck(:id)` when you only need columns; `select` when you need model objects with fewer columns.
7. Bulk writes `update_all`, `insert_all`, `upsert_all` skip validations and callbacks. Use them deliberately and say so.
8. Wrap multi-record changes in `ActiveRecord::Base.transaction do ... end`. Use `with_lock` or `lock!` for read-modify-write on one row.
9. Raw SQL: `where("price > ?", min)` or named binds. Never interpolate params into `where`, `order` or `pluck`; whitelist sort columns.

## 3. Strong parameters

Rails 8:
```ruby
def post_params
  params.expect(post: [:title, :body, tag_ids: []])
end
```
Rails 7.x:
```ruby
def post_params
  params.require(:post).permit(:title, :body, tag_ids: [])
end
```
- `params.expect` returns 400 on a missing or wrongly shaped key instead of raising a 500 on tampered input.
- Never permit `:user_id`, `:role`, `:admin` or `:account_id` from a form; set them from `current_user` on the server.
- Never use `permit!`.

## 4. Background jobs (Active Job)

1. `bin/rails generate job SendReceipt`. Pass records (serialised via GlobalID) or IDs, not big hashes.
2. Enqueue only after the data is committed: `after_create_commit -> { SendReceiptJob.perform_later(self) }` or enqueue after the transaction block ends. A job enqueued inside an open transaction can run before the row exists.
3. Make jobs idempotent: check state first, use unique keys on what they create, and use `retry_on` for transient errors with a limit and `discard_on ActiveJob::DeserializationError` for deleted records.
4. Rails 8 defaults to Solid Queue (`bin/jobs`). Whatever the backend, production needs a supervised worker process; `:async` and `:inline` are for development and tests.

## 5. Migrations that don't take the site down

- One concern per migration. Use reversible `change` or explicit `up`/`down`.
- Adding a column with a constant (non-volatile) default is a metadata-only change on PostgreSQL 11+ and MySQL 8.0.12+; backfilling existing rows is not. Backfill in a separate migration or job with `in_batches`, then add `null: false`.
- Indexes on big PostgreSQL tables:
  ```ruby
  disable_ddl_transaction!
  def change
    add_index :orders, :customer_id, algorithm: :concurrently
  end
  ```
- Removing a column: first add it to `self.ignored_columns` and deploy, then drop it in a later deploy.
- Renaming a column or table in place breaks running code. Add new, write both, backfill, switch reads, drop old.
- Add foreign keys with `add_foreign_key ..., validate: false`, then `validate_foreign_key` in a second migration on large tables.
- If the project uses `strong_migrations`, follow its messages; don't silence them with `safety_assured` without telling the user why.

## 6. Credentials and config

- Secrets live in encrypted credentials: `bin/rails credentials:edit --environment production`. Read with `Rails.application.credentials.dig(:stripe, :secret_key)`.
- Never commit `config/master.key` or `config/credentials/*.key`; production gets `RAILS_MASTER_KEY` from the environment.
- Non-secret per-environment settings go in `config/environments/*.rb` or `config_for(:name)` YAML.
- Keep `config.force_ssl = true` and `config.filter_parameters` covering tokens and passwords in production.

## 7. Hotwire basics

- Turbo Drive is on by default. A failed form must render with a 4xx status, or Turbo won't show the errors:
  ```ruby
  if @post.save
    redirect_to @post
  else
    render :new, status: :unprocessable_entity   # 422; Rack 3.1+ also names it :unprocessable_content
  end
  ```
- Turbo Frames (`turbo_frame_tag dom_id(post)`) replace one part of the page; the response must contain a frame with the same id.
- Turbo Streams (`turbo_stream.replace`, `.append`, `.remove`) for multi-part updates from a form response or `broadcasts_to` over Action Cable.
- Stimulus controllers for small client behaviour; keep state in the HTML, not in the controller.
- Authorization still happens in the controller; a frame request is a normal request.

## 8. Testing

- Model tests for validations, scopes and domain methods. Request (or integration) tests for every controller action, including the "other user gets 404/403" case. System tests (Capybara) only for critical flows and Turbo behaviour.
- Use the project's fixtures or FactoryBot; don't introduce the other.
- Jobs: `assert_enqueued_with(job: SendReceiptJob)` (or `have_enqueued_job` in RSpec), and `perform_enqueued_jobs` to run them inline.
- Mail: `assert_emails(1) { ... }`. Time: `travel_to`. HTTP: WebMock, never real network.

## Stop and ask the user

- Before a migration that drops, renames or rewrites a column or table with data, or locks a large table.
- Before changing the job backend, cache store or session store.
- Before editing production credentials or rotating `secret_key_base`.

## Never

- Never commit master keys or put secrets in `database.yml` or code.
- Never `permit!` or permit ownership and role fields.
- Never enqueue a job inside an open transaction that the job depends on.
- Never run `db:drop`, `db:reset` or `db:schema:load` against a shared or production database.

## Finish

Run the suite and, if migrations changed, `bin/rails db:migrate` then `bin/rails db:rollback` then migrate again to prove reversibility. Report: files changed, queries fixed, migrations and their deploy order, and anything untested.
