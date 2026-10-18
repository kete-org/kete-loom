---
name: php-testing
description: Writing and fixing PHP test suites with PHPUnit or Pest, including attribute-based data providers and Pest datasets, test doubles via createMock/createStub or Mockery, database tests isolated by transactions, HTTP controller and client tests, and coverage with Xdebug or PCOV. Use when adding PHP unit or integration tests, converting PHPUnit annotations to attributes, deciding what to mock in PHP, or making a flaky PHP test deterministic.
license: MIT
compatibility: Any Agent Skills host. Needs php and composer; Xdebug or PCOV only for coverage.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "php, composer"
  kete-loom/owner: "Kete-org"
---

# PHP testing

Tests that are fast, isolated and readable, written in whichever framework the project already uses.

## 0. Before you write

1. Identify the runner: `vendor/bin/pest` if `pestphp/pest` is in `composer.json` `require-dev`, else `vendor/bin/phpunit`. Check `composer.json` `scripts` for a `test` script and use it (`composer test`).
2. Read `phpunit.xml(.dist)`: test suites, bootstrap, `<php><env>` values (for example `APP_ENV=testing`, `DB_CONNECTION`), and `<source>` for coverage.
3. Note the PHPUnit major version (`composer show phpunit/phpunit`). PHPUnit 10 introduced attributes; 11 deprecated docblock annotations; 12 removed them. Make data providers `public static`: non-static providers are deprecated from PHPUnit 10.
4. Run the existing suite once. If it already fails, **stop and tell the user** which tests fail before you change anything.
5. Find the framework helpers already in use (Laravel `Tests\TestCase`, Symfony `KernelTestCase`/`WebTestCase`, a project base class) and extend the same one.

## 1. Layout and naming

- Mirror `src/` under `tests/Unit` and `tests/Feature` (or `tests/Integration`). Test class name = class under test + `Test`, autoloaded via `autoload-dev`.
- One behaviour per test. Name it as a sentence: `test_it_rejects_an_expired_coupon()` or `#[Test] public function rejectsExpiredCoupon()`; in Pest, `it('rejects an expired coupon', ...)`.
- Arrange, act, assert. Use the most specific assertion: `assertSame` (strict) over `assertEquals`, `assertCount`, `assertInstanceOf`, `expectException(X::class)` plus `expectExceptionMessage()`.

## 2. Data providers and datasets

PHPUnit 10+:

```php
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;

final class SlugTest extends TestCase
{
    public static function cases(): iterable
    {
        yield 'spaces' => ['Hello World', 'hello-world'];
        yield 'unicode' => ['Crème Brûlée', 'creme-brulee'];
        yield 'empty' => ['', ''];
    }

    #[Test]
    #[DataProvider('cases')]
    public function slugifies(string $input, string $expected): void
    {
        self::assertSame($expected, Slug::from($input));
    }
}
```

Pest:

```php
it('slugifies', function (string $input, string $expected) {
    expect(Slug::from($input))->toBe($expected);
})->with([
    'spaces' => ['Hello World', 'hello-world'],
    'empty' => ['', ''],
]);
```

- Always key the cases so a failure names the case.
- Converting annotations: `@dataProvider x` → `#[DataProvider('x')]`, `@test` → `#[Test]`, `@group g` → `#[Group('g')]`, `@covers` (class level) → `#[CoversClass(Foo::class)]`. Make provider methods `static`. Rector's PHPUnit sets can do this in bulk: ask before running it across the suite.

## 3. Test doubles

- Mock what you don't own and what is slow or nondeterministic: HTTP clients, mailers, queues, the clock, random sources. Don't mock value objects, entities or the class under test.
- PHPUnit: `$this->createStub(Repo::class)` when you only need return values (`->method('find')->willReturn($user)`); `$this->createMock(Repo::class)` when the call itself is the behaviour (`->expects($this->once())->method('save')->with($order)`).
- Mockery (if installed): `Mockery::mock(Repo::class)->shouldReceive('find')->once()->andReturn($user)`; make sure `Mockery::close()` runs (the `MockeryPHPUnitIntegration` trait or Pest does this).
- Final classes can't be doubled by PHPUnit. Depend on an interface, or use a hand-written fake. Don't remove `final` just to mock it.
- Time: inject a clock (`Psr\Clock\ClockInterface`, Symfony `MockClock`, Laravel `$this->travelTo()`/`Carbon::setTestNow()`). Never `sleep()` in a test.
- Prefer a small in-memory fake (`InMemoryOrderRepository`) over a deep mock chain; if setup needs more than three expectations, rethink the seam.

## 4. Database tests

- Use a dedicated test database, configured in `phpunit.xml` `<env>` or `.env.testing`. Never point tests at a shared or production database: **stop and ask** if the configured DSN looks like one.
- Isolate each test in a transaction that rolls back:
  - Laravel: `use RefreshDatabase;` (migrates once, wraps each test) or `DatabaseTransactions` for an already-migrated database.
  - Symfony + Doctrine: `dama/doctrine-test-bundle` (enable its PHPUnit extension in `phpunit.xml`).
  - Plain PDO: `beginTransaction()` in `setUp()`, `rollBack()` in `tearDown()`.
- Transactions don't cover code that opens its own connection, commits explicitly, or runs DDL (MySQL commits implicitly on DDL). Those tests need truncation or a fresh schema.
- Create data with factories (Laravel model factories, Foundry for Symfony), only the fields the test cares about.
- SQLite in memory is fast but is not MySQL or Postgres: JSON, collation, locking and constraint behaviour differ. Run integration tests against the production engine (a container in CI) when those matter.

## 5. HTTP code

- Your endpoints: use the framework's test client, not a running server.
  - Laravel: `$this->postJson('/api/orders', $payload)->assertCreated()->assertJsonPath('data.status', 'paid');`, `actingAs($user)`.
  - Symfony: `$client = static::createClient(); $client->request('POST', '/orders'); self::assertResponseStatusCodeSame(201);`.
  - PSR-15 apps: build a `ServerRequest` and call the handler directly.
- Cover per endpoint: success, validation failure (422/400), unauthenticated (401), forbidden (403), not found (404).
- Outgoing HTTP: never hit real services. Use Guzzle `MockHandler` with a `HandlerStack`, Symfony `MockHttpClient`, or Laravel `Http::fake()` plus `Http::preventStrayRequests()`. Assert the request you sent (method, URL, body), not only how you handled the response.

## 6. Running and coverage

- Single test: `vendor/bin/phpunit --filter slugifies tests/Unit/SlugTest.php`, `vendor/bin/pest --filter "slugifies"`.
- Random order shakes out hidden coupling: `--order-by=random` (PHPUnit), `--random-order-seed=<seed>` to reproduce.
- Parallel: `vendor/bin/pest --parallel`, `php artisan test --parallel`, or `brianium/paratest`. Each worker needs its own database.
- Coverage needs Xdebug (`XDEBUG_MODE=coverage`) or PCOV: `vendor/bin/phpunit --coverage-text`, `vendor/bin/pest --coverage --min=80`. Cover the new branches; don't chase a number.

## 7. Flaky tests

1. Rerun with `--order-by=random` and a fixed seed to see whether order matters.
2. Look for shared state: static properties, singletons, the service container, global time, leftover rows, the filesystem.
3. Replace the nondeterminism (clock, random, network) with a fake. Don't add retries or sleeps.

## Never

- Delete, skip (`markTestSkipped`) or weaken an assertion to make the suite pass without telling the user why.
- Call real third-party APIs, send real email or charge real payment methods from tests.
- Assert on `assertEquals` when the type matters, or `assertTrue($a == $b)` instead of a specific assertion.
- Leave `dd()`, `dump()`, `var_dump()` or `->only()` (Pest) in committed tests.

## Report

When done, state: tests added or changed (file and test names), the command you ran and its result, and anything not run (for example "integration tests need MySQL, not run").
