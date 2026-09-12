# Agent workflow

- Astra coordinates scope, plans, reviews, and final integration decisions.
- GPT-5.6 Luna owns primary implementation work in this pilot worktree.
- GPT-5.5 provides independent review or complex fixes when requested; agents do not spawn further agents unless that delegation is explicitly worthwhile and authorized.
- Preserve the source `main` checkout and unrelated user changes. Make implementation changes only in this worktree.
- Keep live Supabase behavior, demo behavior, and deferred features clearly separated, and verify claims against the code and hosted checks before reporting them as complete.
