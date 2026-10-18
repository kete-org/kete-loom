---
name: ruby-testing
description: Writes and stabilises Ruby test suites in whichever framework the project already runs, RSpec or Minitest, with FactoryBot or fixtures, verifying doubles and stubs, frozen or travelled time, WebMock and VCR to keep tests off the network, and a seed-and-bisect routine for order-dependent or flaky specs. Use when adding RSpec examples or Minitest tests to a Ruby or Rails codebase, stubbing an HTTP client or the clock in Ruby, or tracking down a spec that fails only in CI or only with some seeds.
license: MIT
compatibility: Any Agent Skills host. Needs ruby, bundler and the project's test framework (rspec or minitest); webmock, vcr, factory_bot and timecop only if the project uses them.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "ruby, bundle"
  kete-loom/owner: "Kete-org"
---

# Ruby testing with RSpec or Minitest

Fast, isolated tests that fail for one clear reason.

## 0. Find the setup

1. Detect the framework: `spec/` + `.rspec` + `rspec` in `Gemfile.lock` means RSpec; `test/` + `minitest` (or Rails `test_helper.rb`) means Minitest. Use that one. Never add the other framework.
2. Find the command: `bin/rspec`, `bundle exec rspec`, `bin/rails test`, `bundle exec rake test`, or what CI runs. Always go through Bundler.
3. Read `spec/spec_helper.rb` / `rails_helper.rb` / `spec/support/**` or `test/test_helper.rb`. Reuse existing helpers, shared contexts, factories and fixtures.
4. Run the suite (or the relevant directory) once. If it already fails, **stop and tell the user** which tests fail before you change anything.
5. Note what is installed: `factory_bot`, `webmock`, `vcr`, `timecop`, `database_cleaner`, `shoulda-matchers`, `rspec-rails`. Use them; ask before adding a gem.

## 1. Writing a test

**RSpec**

```ruby
RSpec.describe Invoice do
  describe "#total" do
    it "rejects a negative quantity" do
      invoice = described_class.new(lines: [{ price: 5, quantity: -1 }])
      expect { invoice.total }.to raise_error(Invoice::InvalidLine, /quantity/)
    end
  end
end
```

- `describe` the unit or method (`"#instance_method"`, `".class_method"`), `context "when ..."` for a condition, `it` for one behaviour.
- `let` for lazy values, `let!` only when the record must exist before the example. Don't nest `let` overrides more than two levels deep.
- Floats: `be_within(0.001).of(0.3)`. Collections: `contain_exactly`, `match_array`, `include`.

**Minitest**

```ruby
class InvoiceTest < Minitest::Test   # ActiveSupport::TestCase in Rails
  def test_total_rejects_negative_quantity
    invoice = Invoice.new(lines: [{ price: 5, quantity: -1 }])
    error = assert_raises(Invoice::InvalidLine) { invoice.total }
    assert_match(/quantity/, error.message)
  end
end
```

- `assert_equal expected, actual` (expected first). `assert_in_delta` for floats.
- Spec-style Minitest: wrap the value, `_(total).must_equal 5`. minitest 6 removed the expectation methods from `Object`, so a bare `total.must_equal 5` raises `NoMethodError`.

Both: test through the public interface, one behaviour per test, arrange-act-assert. Keep the `raise_error` / `assert_raises` block to the single call that should raise.

## 2. Test data

- **FactoryBot:** factories hold the minimum valid attributes; add `trait`s for variants. Prefer `build` or `build_stubbed` (no DB) over `create`; use `create` only when the test reads back from the database. Use `sequence` for unique fields.
- Avoid deep association chains in factories; they make every `create` insert many rows.
- **Rails fixtures** (`test/fixtures/*.yml`): fine for stable reference data; reference them by name (`users(:alice)`). Don't mutate shared fixtures in a way later tests rely on.
- Each test builds its own data. Never depend on records created by another test.

## 3. Doubles and stubs

- Stub only boundaries: HTTP clients, payment gateways, mailers, the clock, randomness. Never stub the object under test.
- **RSpec:** prefer verifying doubles so stubs break when the real API changes: `instance_double(PaymentGateway, charge: result)`, `class_double`, `object_double`. Also set `config.mock_with(:rspec) { |m| m.verify_partial_doubles = true }`.
  - `allow(x).to receive(:y).and_return(z)` to stub; `expect(x).to receive(:y).with(args)` only when the call itself is the behaviour.
  - Spies: `allow(...)` then `expect(x).to have_received(:y)` after acting.
  - Avoid `allow_any_instance_of`; inject the collaborator instead.
- **Minitest:** `Object#stub` and `Minitest::Mock` come from `require "minitest/mock"`. From minitest 6 they live in the separate `minitest-mock` gem; add it to the Gemfile if the require fails. Call `mock.verify` at the end.

## 4. Time, randomness and the network

- **Time:** in Rails use `ActiveSupport::Testing::TimeHelpers` (`travel_to Time.zone.local(2025, 1, 31) { ... }`, `freeze_time`); include it in RSpec via `config.include ActiveSupport::Testing::TimeHelpers`. Outside Rails use `Timecop.freeze` with `Timecop.return` in an `after` hook, or inject a clock. Test month ends, leap days and DST boundaries explicitly.
- **Randomness:** RSpec: `config.order = :random` and `Kernel.srand config.seed` so a seed reproduces everything. Minitest randomises order by default; reuse with `--seed N`.
- **Network:** `require "webmock/rspec"` (or `webmock/minitest`) and `WebMock.disable_net_connect!(allow_localhost: true)` in the helper. Stub with `stub_request(:post, "https://api.example.com/charges").with(body: hash_including(amount: 500)).to_return(status: 200, body: json)`.
- **VCR** for recorded responses: `filter_sensitive_data("<API_KEY>") { ENV["API_KEY"] }` so secrets never land in cassettes; use `record: :once` and re-record deliberately. Check every new cassette for tokens and personal data before committing.
- **Filesystem:** `Dir.mktmpdir` with a block, never the repo tree or `/tmp` paths shared between tests.

## 5. Fixing a flaky test

1. Reproduce with the CI seed: `bundle exec rspec --seed 12345` or `bin/rails test --seed 12345`.
2. Order-dependent? RSpec: `bundle exec rspec --bisect --seed 12345` finds the minimal pair. Minitest: the `minitest-bisect` gem, if installed.
3. Run the single test repeatedly to separate timing flakiness from order: loop it 20 times in the shell.
4. Common causes and fixes:
   - Leaked state: class-level caches, `ENV`, globals, `Rails.cache`, `Current` attributes. Reset in `after`, or avoid the global.
   - Time: `Date.today` vs `Time.zone.today`, tests near midnight or month end. Freeze time.
   - Ordering: queries without `order` compared with `eq`. Use `contain_exactly` or add `order`.
   - Database: data committed outside the transaction (threads, `after_commit` in system tests). Use the project's cleaning strategy.
   - Async: `sleep` in tests. Wait on a condition (Capybara's waiting matchers) or run jobs inline (`perform_enqueued_jobs`).
5. Fix the cause. Do not add `retry` gems, sleeps, or skips to hide it.

## 6. Speed

- Profile: `bundle exec rspec --profile 10`. Look for `create` where `build_stubbed` would do, and `before(:all)` / `let!` creating unused data.
- Parallelise only with the project's tool (`parallelize` in Rails, `parallel_tests`), after tests are isolated.

## Rules

- Never delete, skip (`skip`, `xit`, `pending`) or loosen an existing test to make the suite pass. If a test is wrong, explain why and get agreement first.
- No real network, no real clock, no sleeps.
- Don't assert on private methods or `instance_variable_get`.
- After three focused attempts without green, stop and report what you tried.

## Report back

End with: tests added or changed (file and description), the exact command and seed you ran, final pass/fail counts, and anything left untested.
