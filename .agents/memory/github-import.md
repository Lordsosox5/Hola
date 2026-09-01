---
name: GitHub repository import
description: Reliable fallback when GitHub archive downloads are blocked or repository file requests are rate-limited.
---

GitHub archive downloads may be blocked by the connector, and bursting Git blob requests can trigger secondary rate limits. Prefer the authenticated contents API with low concurrency and retry backoff when importing a repository.

**Why:** The archive endpoint returned a provider-level denial, while parallel blob requests were rate-limited.

**How to apply:** Fetch the tree first, then copy tracked files with a small worker pool; preserve platform-managed project metadata when registering an imported artifact.