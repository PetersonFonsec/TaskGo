# Git And Workspace Safety

- The worktree may contain user changes. Never revert or overwrite changes you did not make unless explicitly asked.
- Avoid destructive commands. Do not run `git reset --hard`, `git checkout --`, `git clean`, or recursive removal commands without explicit approval.
- Check the relevant diff before claiming a change is complete.
- Keep commits, if requested, focused on the task.
- Do not include generated cache, build output, coverage, or local environment files in commits unless explicitly required.
- If unrelated changes are present, ignore them and work only on the requested scope.
- If unrelated changes block the task, ask for direction with a concise explanation.
