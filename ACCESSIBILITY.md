# Accessibility quality pass

Galactrix keeps two kinds of accessibility checks: **automated guards** that run with `npm test`
and a **manual pass** that must be repeated for every new or restructured screen.

## Automated guards

`test/frontend/accessibility.test.ts` scans `src/` and fails the build when:

- an icon-only `Button` (`isIconOnly`) or a native icon-only `<button>` has no `aria-label`;
- a translucent tinted banner (`bg-warning/10`, `bg-success/10`, …) pairs with the dark
  `*-foreground` text tokens instead of the color itself;
- the native buttons in the guarded components (chat sidebar collections, tag modal, variant
  comparison, context inspector, message revisions) lack a visible `focus-visible` ring;
- `App.css` stops honoring `prefers-reduced-motion`;
- the compact touch-target sizes (collection chips `min-h`, rating stars padding) regress.

Related guards in other test files pin the tab chevron visibility, mobile stacking of the data
health header, and the keyboard-overlay behavior on Android.

## Manual pass (run per screen, at minimum per release)

Work through this checklist with the screen open on desktop **and** on an Android phone.

### Keyboard-only navigation

1. Unplug the mouse. Reach every interactive element using `Tab`/`Shift+Tab` in a logical order.
2. Activate every control with `Enter` and `Space`; toggles must flip, menus must open.
3. Every focused element shows the visible focus ring (`ring-focus`), never `outline: none`
   without a replacement.
4. Opening a modal traps focus inside it; closing it (Escape, backdrop, footer button) returns
   focus to the element that opened it.
5. `Escape` closes modals and nested menus; the chat composer keeps no trapped focus.

### Screen-reader names

6. With VoiceOver (macOS) or TalkBack (Android), every icon-only control announces a meaningful
   name (`aria-label`), not "button".
7. Toggles announce their state (`aria-pressed`, `aria-selected`, `aria-current`).
8. Async status banners (diagnostics "checking", health status, generation warnings) use
   `role="status"` so changes are announced.
9. Decorative icons are `aria-hidden` (the shared `Icon` component does this by default).

### Contrast

10. Text on tinted translucent fills uses the color token itself (`text-warning`), never the
    `*-foreground` variant — those resolve to near-black in the dark themes.
11. Check both themes and both contrast modes: muted text on cards must stay readable at the
    smallest interface scale.

### Reduced motion and scalable text

12. Enable `prefers-reduced-motion` (OS setting): entrances, presence transitions and tab
    indicators must not animate; the app animation setting must also disable them.
13. Raise the interface scale to its maximum: no clipped labels, no overlapped controls, no
    horizontal scrolling on the checked screen.

### Touch targets and mobile layout

14. On a phone (~360px width): no control overflows the viewport; primary actions are full width;
    side-by-side layouts only appear from the `sm:`/`md:` breakpoints.
15. Interactive targets are at least ~40px tall (chips use `min-h-9`/`py-1.5`, stars use `p-2`).
16. With the keyboard open on Android the layout must not resize, pan or jitter — the window
    stays fixed (`SOFT_INPUT_ADJUST_NOTHING`, enforced programmatically) and the keyboard
    overlays the content. The chat composer rides above the keyboard through visual-viewport
    metrics; modal content stays reachable by scrolling the modal body.

### Recording results

Note the screen, the date and any deviation in the pull request. If an item cannot be verified on
this platform (for example Android-only behavior), say so explicitly instead of marking it done.
