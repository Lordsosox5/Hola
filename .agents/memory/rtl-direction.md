---
name: Tawsel language direction
description: Direction handling for Tawsel's Arabic and English modes.
---

Tawsel must use the active language as the source of truth for layout direction: Arabic is `rtl`, English is `ltr`.

**Why:** React Native Web combines the root `direction` value with flex direction. Keeping `row-reverse` alongside an RTL root double-reverses layouts and makes Arabic appear LTR.

**How to apply:** Keep directional rows as normal `row` layouts and let the root direction determine visual order. Transform text alignment and input writing direction only for English; keep Arabic text right-aligned where the component needs explicit alignment.