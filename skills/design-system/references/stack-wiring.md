# Wiring tokens into the stack

Use the section for the detected stack. Keep the project's existing theme provider and file layout; these snippets show where the tokens go, not a new structure.

## Plain CSS (any web stack)

```css
/* tokens.css: imported once, before component styles */
:root {
  --gray-50: oklch(0.985 0 0); --gray-900: oklch(0.21 0.006 286);
  --blue-600: oklch(0.546 0.245 262.9);
  --color-bg: var(--gray-50);
  --color-text: var(--gray-900);
  --color-accent: var(--blue-600);
  --color-on-accent: #fff;
  --space-4: 1rem;
  --radius-md: 0.5rem;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --color-bg: var(--gray-900); --color-text: var(--gray-50); }
}
:root[data-theme="dark"] { --color-bg: var(--gray-900); --color-text: var(--gray-50); }
```

Components reference only semantic tokens: `color: var(--color-text)`.

## Tailwind CSS 4

Tokens are CSS variables in `@theme`; Tailwind generates utilities from them.

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --color-brand-600: oklch(0.546 0.245 262.9);
  --radius-md: 0.5rem;
}
/* semantic layer that switches with the theme */
:root { --bg: var(--color-white); --fg: var(--color-gray-900); }
.dark { --bg: var(--color-gray-950); --fg: var(--color-gray-50); }
@theme inline { --color-bg: var(--bg); --color-fg: var(--fg); }
```

Use `bg-bg text-fg`, not `bg-white dark:bg-gray-950` repeated across components. Avoid arbitrary values (`p-[13px]`, `text-[#1f2937]`); `scripts/token-audit.js` reports them.

## Tailwind CSS 3

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class', // 'selector' on 3.4.1+
  theme: {
    extend: {
      colors: { bg: 'rgb(var(--color-bg) / <alpha-value>)', fg: 'rgb(var(--color-fg) / <alpha-value>)' },
      borderRadius: { md: 'var(--radius-md)' },
    },
  },
};
```

Store the variables as space-separated channels (`--color-bg: 255 255 255;`) so opacity modifiers work. Pass the channels wrapped, for example `rgb(255 255 255)`, to `contrast.js` if you check literals, or check the semantic tokens through `--css` after writing them as full colours.

## shadcn/ui

Keep shadcn's variable names; they are the semantic layer. Each surface has a `-foreground` partner.

```css
:root {
  --background: oklch(1 0 0); --foreground: oklch(0.145 0 0);
  --primary: oklch(0.546 0.245 262.9); --primary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.97 0 0); --muted-foreground: oklch(0.556 0 0);
  --border: oklch(0.922 0 0); --ring: oklch(0.546 0.245 262.9);
  --destructive: oklch(0.577 0.245 27.3);
  --radius: 0.625rem;
}
.dark { --background: oklch(0.145 0 0); --foreground: oklch(0.985 0 0); /* ... */ }
```

Older projects use bare HSL triples (`--primary: 221.2 83.2% 53.3%`); `contrast.js` reads those too. Check every `X/X-foreground` pair in both `:root` and `--scope .dark`. Change components by variants (`cva`) in `components/ui`, not by one-off classes at call sites.

## MUI (Material UI 6+)

```ts
const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: { palette: { primary: { main: '#2563eb', contrastText: '#fff' }, background: { default: '#fafafa' } } },
    dark: { palette: { primary: { main: '#93c5fd', contrastText: '#0b1220' }, background: { default: '#0b0f19' } } },
  },
  typography: { fontFamily: 'Inter, system-ui, sans-serif', htmlFontSize: 16 },
  shape: { borderRadius: 8 },
  spacing: 4,
});
```

Check `main/contrastText` and text/background pairs with `contrast.js` literals.

## React Native / Expo

```ts
export const tokens = {
  light: { bg: '#fafafa', text: '#18181b', accent: '#2563eb', onAccent: '#ffffff' },
  dark: { bg: '#0b0f19', text: '#f4f4f5', accent: '#93c5fd', onAccent: '#0b1220' },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32 },
  radius: { sm: 4, md: 8, full: 999 },
};
export const useTokens = () => (useColorScheme() === 'dark' ? tokens.dark : tokens.light);
```

Leave `allowFontScaling` on and test at the largest text size.

## Flutter

Use `ColorScheme` for colours (explicitly, or `ColorScheme.fromSeed` and then verify the generated pairs), `TextTheme` for type roles, and a `ThemeExtension` for spacing and radii:

```dart
@immutable
class AppSpacing extends ThemeExtension<AppSpacing> {
  const AppSpacing({this.s2 = 8, this.s4 = 16, this.s6 = 24});
  final double s2, s4, s6;
  @override AppSpacing copyWith({double? s2, double? s4, double? s6}) => AppSpacing(s2: s2 ?? this.s2, s4: s4 ?? this.s4, s6: s6 ?? this.s6);
  @override AppSpacing lerp(AppSpacing? other, double t) => this;
}
MaterialApp(theme: ThemeData(colorScheme: light, extensions: const [AppSpacing()]), darkTheme: ThemeData(colorScheme: dark, extensions: const [AppSpacing()]));
```

Read with `Theme.of(context).colorScheme.primary` and `Theme.of(context).extension<AppSpacing>()!.s4`.

## SwiftUI

Colours as Color Sets in the asset catalog with Any and Dark appearances (and High Contrast variants where useful); type through text styles so Dynamic Type works:

```swift
extension Color { static let accentFill = Color("AccentFill"); static let textPrimary = Color("TextPrimary") }
extension Font { static let bodyApp = Font.custom("Inter", size: 17, relativeTo: .body) }
enum Space { static let s2: CGFloat = 8; static let s4: CGFloat = 16 }
```

## Jetpack Compose

```kotlin
private val Light = lightColorScheme(primary = Color(0xFF2563EB), onPrimary = Color.White, background = Color(0xFFFAFAFA))
private val Dark = darkColorScheme(primary = Color(0xFF93C5FD), onPrimary = Color(0xFF0B1220), background = Color(0xFF0B0F19))
data class Spacing(val s2: Dp = 8.dp, val s4: Dp = 16.dp)
val LocalSpacing = staticCompositionLocalOf { Spacing() }

@Composable fun AppTheme(dark: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) =
  CompositionLocalProvider(LocalSpacing provides Spacing()) { MaterialTheme(colorScheme = if (dark) Dark else Light, typography = AppTypography, content = content) }
```

Use `sp` for text so font scaling applies, and keep 48dp minimum touch targets.
