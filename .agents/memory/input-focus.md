---
name: Tawsel input focus
description: Why Tawsel text fields previously accepted only one character at a time.
---

Screens declared inside the main app component close over shared state, so they should be invoked during rendering rather than rendered as JSX component types. Recreating their component identity on every state update remounts the screen and makes controlled text inputs lose focus.

**Why:** A keystroke updates the parent state; a nested component declared on that parent then receives a new function identity. React treats it as a new component and resets the input after one character.

**How to apply:** Keep reusable stateful screens at module scope, or, when a screen intentionally closes over the parent state, call the screen function from the render switch and keep the actual input component types stable.