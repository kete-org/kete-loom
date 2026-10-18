---
name: dart-testing
description: Writes deterministic Dart and Flutter tests with package:test and flutter_test, fakes collaborators with mocktail, asserts on Futures and Streams with expectLater and stream matchers, controls time with fake_async, and sets up basic golden image tests. Use when adding or fixing unit, widget or golden tests in a Dart or Flutter project, mocking a repository or HTTP client with mocktail, or chasing a flaky async test that hangs, times out or passes only sometimes.
license: MIT
compatibility: Any Agent Skills host. Needs the Dart SDK (dart test) or Flutter (flutter test). mocktail and fake_async are pub packages added as dev dependencies.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: testing
  kete-loom/risk: runs-commands
  kete-loom/requires: "dart"
  kete-loom/owner: "Kete-org"
---

# Dart testing

Tests that run fast, never touch the network, and fail for one reason. Use `dart test` for pure Dart packages and `flutter test` for anything importing Flutter. Integration tests on a device (`integration_test`) and browser E2E are out of scope here.

## 0. Before you write

1. Check `dev_dependencies` in `pubspec.yaml`: `test` (pure Dart) or `flutter_test` (Flutter, from the SDK), plus `mocktail` if present. If the project uses `mockito` instead, follow it; don't add a second mocking library.
2. Run the existing suite once (`dart test` or `flutter test`) and note failures that were already there.
3. Mirror the source layout: `lib/src/cart.dart` is tested in `test/src/cart_test.dart`. Files must end in `_test.dart` to be picked up.

## 1. Test shape

```dart
import 'package:test/test.dart'; // Flutter: package:flutter_test/flutter_test.dart

void main() {
  group('Cart.total', () {
    late Cart cart;
    setUp(() => cart = Cart());

    test('is zero when empty', () {
      expect(cart.total, Money.zero);
    });

    test('throws on negative quantity', () {
      expect(() => cart.add(item, quantity: -1), throwsA(isA<ArgumentError>()));
    });
  });
}
```

- One behaviour per `test`; name it as a sentence a reader understands in the failure log.
- Build fresh state in `setUp`; register cleanup with `addTearDown(...)` right where the resource is created.
- Prefer specific matchers (`equals`, `isA<T>().having((e) => e.code, 'code', 404)`, `containsAll`, `closeTo`) over `isTrue` on a hand-built boolean, so failures print useful values.
- Run one test while iterating: `dart test test/src/cart_test.dart --name "is zero"`.

## 2. Mocking with mocktail

```dart
class MockUserApi extends Mock implements UserApi {}
class FakeUri extends Fake implements Uri {}

setUpAll(() => registerFallbackValue(FakeUri()));

test('maps 404 to UserNotFound', () async {
  final api = MockUserApi();
  when(() => api.fetch(any())).thenThrow(const HttpFailure(404));
  final repo = UserRepository(api);

  await expectLater(repo.load('42'), throwsA(isA<UserNotFound>()));
  verify(() => api.fetch(any())).called(1);
});
```

- Stub Future- and Stream-returning methods with `thenAnswer((_) async => value)` / `thenAnswer((_) => Stream.value(x))`, not `thenReturn`.
- An unstubbed method that returns a non-nullable type throws at call time; stub every call the code under test makes.
- `any()` with a custom type needs `registerFallbackValue` once, usually in `setUpAll`. Named arguments use `any(named: 'id')`.
- `verifyNever(...)` for calls that must not happen; `captureAny()` with `verify(...).captured` to inspect arguments.
- Mock only boundaries (HTTP, database, platform channels, clock). Never mock the class under test or simple value types; use real instances or a hand-written `Fake`.

## 3. Async code

- Make the test body `async` and `await` the call. A test that returns before its future completes passes without checking anything.
- Assert on a future with `await expectLater(future, completion(equals(x)))` or `throwsA(...)`. Use `expectLater`, not `expect`, when the matcher is asynchronous.
- Never use real `Future.delayed` or sleeps to wait for something. Inject the delay or use `fake_async` (section 5).
- The default per-test timeout is 30 seconds; a hang usually means an un-completed `Completer`, an un-closed stream, or a missing stub. Fix the cause instead of raising `timeout:`.

## 4. Streams

```dart
test('emits loading then data then closes', () async {
  final states = bloc.states; // the Stream under test
  final check = expectLater(states, emitsInOrder([isA<Loading>(), isA<Loaded>(), emitsDone]));
  bloc.load();
  await check;
});
```

- Start `expectLater` before triggering the events, then await it, so no event is missed on a broadcast stream.
- Matchers: `emits(x)`, `emitsInOrder([...])`, `emitsThrough(x)`, `emitsError(isA<E>())`, `mayEmit(x)`, `neverEmits(x)`, `emitsDone`.
- Collect a finite stream with `await stream.toList()` when order and count are all that matter.
- Close controllers in `addTearDown(controller.close)` so a failing test does not leak listeners into the next one.

## 5. Time with fake_async

Add `fake_async` as a dev dependency. It controls `dart:async` time: `Timer`, `Future.delayed`, `Stream.periodic` and microtasks. It cannot control `DateTime.now()` or `Stopwatch`, because they are not part of `dart:async`.

```dart
test('retries after 2 seconds', () {
  fakeAsync((async) {
    final client = RetryingClient(api);
    client.send(request);
    async.elapse(const Duration(seconds: 2));
    verify(() => api.post(any())).called(2);
  });
});
```

- The callback is synchronous; don't `await` inside it. Use `async.flushMicrotasks()` to run pending futures and `async.elapse(d)` to advance timers.
- When logic reads the current time, have it use `clock.now()` / `clock.stopwatch()` from `package:clock`; `fakeAsync` overrides those automatically, so they follow `elapse`.
- In widget tests, time is already fake: use `tester.pump(duration)` instead of `fakeAsync`.

## 6. Widget tests (flutter_test)

```dart
testWidgets('shows error text when login fails', (tester) async {
  when(() => auth.login(any(), any())).thenThrow(const AuthFailure());
  await tester.pumpWidget(MaterialApp(home: LoginPage(auth: auth)));

  await tester.enterText(find.byKey(const Key('email')), 'a@b.co');
  await tester.tap(find.text('Sign in'));
  await tester.pumpAndSettle();

  expect(find.text('Invalid credentials'), findsOneWidget);
});
```

- Wrap the widget in the minimum ancestors it needs (`MaterialApp`, providers, `MediaQuery`) and inject fakes through constructors or the project's DI.
- `pump()` renders one frame; `pumpAndSettle()` runs until no frames are scheduled and times out on endless animations (spinners). Use `pump(duration)` for those.
- Real I/O (files, sockets) does not complete inside the fake zone; wrap it in `await tester.runAsync(() async {...})` or, better, fake it.
- Find by `Key`, text or semantics label; avoid finding by widget index.

## 7. Golden tests (basics)

```dart
testWidgets('price tag golden', (tester) async {
  await tester.pumpWidget(const MaterialApp(home: PriceTag(amount: 1250)));
  await expectLater(find.byType(PriceTag), matchesGoldenFile('goldens/price_tag.png'));
});
```

- Create or update reference images with `flutter test --update-goldens`, look at the PNGs, and commit them. Never update goldens just to make a red test green without checking the diff images written to a `failures/` folder next to the test file (the failure message prints the path).
- Goldens differ across operating systems and font setups. Generate and compare them on one platform (usually CI's), and tag them (`@Tags(['golden'])`) so they can run separately.
- Set a fixed surface size (`tester.view.physicalSize` and `devicePixelRatio`, reset in `addTearDown`) so output does not depend on the host.
- If the project uses a golden helper package, follow it; don't add one unasked.

## Stop and ask the user

- The code under test reads globals, singletons or `DateTime.now()` directly and can't be tested without refactoring production code.
- Fixing a failing test would mean changing the expected behaviour rather than the code.
- Goldens would need regenerating across many files.

## Never do

- Hit the real network, real databases or real platform channels in unit or widget tests.
- Skip (`skip:`) or delete a failing test to get green, or raise timeouts to hide a hang.
- Use `sleep` or real delays to wait for async work.

## Report back

Tests added or changed (file and test names), the command run (`dart test ...` / `flutter test ...`) with pass/fail counts, and any behaviour left untested and why.
