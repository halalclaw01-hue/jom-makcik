# Rules for Using Codex Safely

Use Codex carefully. The project has working parts, so future prompts should be specific and limited.

## Before Asking Codex To Fix Or Update

- State the exact problem.
- Provide the error message.
- Mention which app is affected.
- Mention which file or screen is affected if known.
- Ask Codex to inspect first before editing.
- Ask Codex to change only necessary files.
- Tell Codex not to refactor unrelated code.
- Tell Codex not to change database schema unless required.
- Tell Codex to stop and report after the task.

## Safe Codex Repair Prompt

```text
Task only:
Fix this specific issue only.
Do not refactor unrelated code.
Do not rebuild the whole app.
Do not change database schema unless required.
First explain likely cause.
Then modify only necessary files.
After completion, report:
1. Files changed
2. What was fixed
3. How to test
4. Any risk
5. Next recommended step.
```

## Safe Codex Update Prompt

```text
Task only:
Add this one function only.
Do not modify unrelated modules.
Do not change existing working flow unless needed.
Keep role permission and booking state machine rules.
After completion, report:
1. Files changed
2. What was added
3. How to test
4. Any known issue
5. Next recommended step.
```

## Good Request Examples

- "Fix passenger booking list loading only."
- "Add admin filter for payment proof status only."
- "Update rider availability screen only."
- "Check why login fails and change only the affected file."

## Bad Request Examples

- "Fix everything."
- "Improve the whole project."
- "Refactor all backend."
- "Make it production ready now."

## Maintenance Warning

Never ask Codex to "fix everything" or "improve the whole project" because it may damage working code.
