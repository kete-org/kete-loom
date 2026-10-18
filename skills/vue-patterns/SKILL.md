---
name: vue-patterns
description: Vue 3 Composition API guidance for writing and fixing single-file components with script setup, covering ref versus reactive, reactivity lost by destructuring, computed and watch rules, composables with cleanup, typed defineProps, defineEmits and defineModel, Pinia stores with storeToRefs, and component tests with Vue Test Utils. Use when building or refactoring a Vue 3 component, writing a composable or Pinia store, or debugging a value that stopped updating in a Vue view.
license: MIT
compatibility: Any Agent Skills host. Targets Vue 3.4+ with script setup and TypeScript; notes call out 3.5-only APIs. Tests assume Vitest and @vue/test-utils.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: writes-files
  kete-loom/owner: "Kete-org"
---

# Vue 3 patterns

Write Vue 3 components whose state stays reactive, whose side effects clean up, and whose contracts (props, emits, models) are typed. For Nuxt-specific concerns (useFetch, server routes, SSR), use `nuxt-patterns` alongside this skill.

## 0. Before you write

1. Read `package.json` for the Vue version, Pinia, Vue Router, Vitest and `@vue/test-utils`. APIs marked 3.5 below need Vue 3.5 or later.
2. Match the house style: `<script setup lang="ts">` versus Options API, store layout, file naming. Do not convert a codebase's Options API components to Composition API unless asked.
3. Find an existing component or composable that does something similar and copy its structure.

## 1. Reactivity rules

| Situation | Use |
|---|---|
| Primitive, or a value you replace wholesale | `ref()` |
| Object you only mutate in place, never reassign | `reactive()` (or just `ref()` everywhere for consistency) |
| Large immutable data (API payloads, lists you replace) | `shallowRef()` and assign a new value |
| Derived value | `computed()`, never a watcher that writes another ref |
| Side effect when something changes | `watch()` / `watchEffect()` |

Reactivity breaks in predictable places. Check each one:

1. **Destructuring a `reactive` object** gives plain values: `const { count } = state` never updates. Use `toRefs(state)` or keep `state.count`.
2. **Reassigning a `reactive` variable** (`state = reactive({...})`) disconnects the template. Mutate fields or switch to `ref`.
3. **Destructuring a Pinia store** loses reactivity for state and getters. Use `const { items, total } = storeToRefs(store)`; take actions directly from the store.
4. **Passing `props.x` into a composable** passes a snapshot. Pass `() => props.x` or `toRef(props, 'x')` and read it with `toValue()` inside.
5. **Props destructure**: on Vue 3.5+, `const { size = 'md' } = defineProps<...>()` stays reactive, but `watch(size, ...)` does not work; watch `() => size`. On earlier versions, do not destructure props.
6. **`.value`**: needed in script, never in templates for top-level refs. A ref nested inside a plain object in the template is not unwrapped.

## 2. Computed and watchers

- `computed` getters must be pure: no requests, no mutation, no writes to other refs.
- Prefer `watch(source, cb)` with an explicit source over `watchEffect` when the effect does async work, so the dependencies are obvious.
- Cancel stale async work. Use the `onCleanup` argument (`watch(id, async (v, _old, onCleanup) => { const ctl = new AbortController(); onCleanup(() => ctl.abort()); ... })`), or `onWatcherCleanup()` on 3.5+.
- Watchers created synchronously in `setup` stop with the component. A watcher created after an `await` or inside a timeout does not: keep the returned stop handle and call it in `onUnmounted`.
- Use `{ immediate: true }` instead of calling the handler once by hand. Use `{ deep: true }` only when you truly need nested changes; it walks the whole object.

## 3. Composables

1. Name them `useX`, put them in `composables/`, and return an object of refs (not a `reactive`) so callers can destructure.
2. Accept `MaybeRefOrGetter<T>` arguments and read them with `toValue()` inside a `watch` or `computed`.
3. Every listener, interval, observer or subscription a composable starts gets torn down in `onUnmounted` (or `onScopeDispose` when it may run outside a component).
4. Call composables synchronously at the top of `setup`, never inside an event handler, `if`, or after `await`.
5. Keep shared module-level state deliberate: a `ref` declared outside the function is a singleton across every component and, under SSR, across every request. For SSR apps put shared state in Pinia instead.

## 4. Component contracts

```vue
<script setup lang="ts">
const props = withDefaults(defineProps<{ items: Item[]; pageSize?: number }>(), { pageSize: 20 })
const emit = defineEmits<{ select: [id: string]; close: [] }>()
const query = defineModel<string>('query', { default: '' })
</script>
```

- Never mutate a prop. To edit a parent's value, use `defineModel` (3.4+) or emit an event. For a local editable copy, `const draft = ref(structuredClone(toRaw(props.item)))` and say when it resyncs.
- Type emits so callers get checked payloads. Emit names are camelCase in script, listened to as `@select` or `@update:query`.
- Use `v-for` with a stable `:key` from the data, never the index for lists that reorder.
- Never put `v-if` and `v-for` on the same element; filter with a `computed` first.
- Use `useTemplateRef('name')` (3.5+) or a `ref(null)` with a matching `ref="name"` for DOM access, and only touch it after `onMounted`.
- Render untrusted HTML only after sanitising it; `v-html` with user content is an XSS bug.

## 5. Pinia

- Prefer setup stores (`defineStore('cart', () => { ... return { items, total, add } })`) when the codebase has no preference. Return every piece of state, or SSR hydration and devtools miss it.
- Keep server calls in actions, not in components, and handle errors there.
- Use `storeToRefs` when destructuring (rule 1.3).
- Do not call `useCartStore()` at module top level; call it inside `setup`, a composable, an action, or a function that runs after `app.use(pinia)`. Under SSR, a top-level call shares one store across requests.

## 6. Tests

1. Use Vitest with `@vue/test-utils` (`mount`, or `shallowMount` only when children are heavy).
2. Test through the rendered output and emitted events: `wrapper.find('[data-test="save"]').trigger('click')`, then `await nextTick()` or `await flushPromises()`, then assert on `wrapper.text()` or `wrapper.emitted('select')`.
3. For components using Pinia, mount with `global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }` from `@pinia/testing`, or a fresh `createPinia()` per test.
4. Test composables by calling them inside a tiny host component, or directly when they use no lifecycle hooks.
5. Mock the network at the boundary (fetch or the API module), not the component under test.

## Stop and ask the user

- The fix requires switching state management (Vuex to Pinia, Options to Composition API).
- A prop needs two-way binding but the parent is outside the files you were asked to touch.
- Upgrading Vue to get a 3.5 API would be the simplest fix.

## Never

- Never mutate props or a store's state from a template expression.
- Never silence a reactivity bug with `forceUpdate`, `key` bumping or `setTimeout`; find the lost reference.
- Never leave a listener, interval or watcher without a teardown path.

## Report back

List the files changed, which reactivity or contract rule each change applies, the test command you ran and its result, and anything you could not verify in a browser.
