# T-07 Self-Assessment: Bot service — inline keyboard builder

## Implementation

**File written:** `packages/bot/src/keyboard.ts`

### Functions exported

| Function | Signature | Description |
|---|---|---|
| `buildConfirmKeyboard` | `() => InlineKeyboardMarkup` | Three-button row: Confirm / Edit / Cancel |
| `buildDismissKeyboard` | `(nudgeId: number) => InlineKeyboardMarkup` | Single-button row: Dismiss |

### callback_data values

| Button | callback_data |
|---|---|
| Confirm | `confirm` |
| Edit | `edit` |
| Cancel | `cancel` |
| Dismiss | `dismiss:<nudgeId>` |

## Acceptance criteria checklist

- [x] `buildConfirmKeyboard` returns valid `InlineKeyboardMarkup` with three buttons (`confirm`, `edit`, `cancel`)
- [x] `buildDismissKeyboard` returns `InlineKeyboardMarkup` with a single Dismiss button
- [x] callback_data values are exactly `'confirm'`, `'edit'`, `'cancel'`, `'dismiss:<nudgeId>'`

## TypeScript

`npx tsc --noEmit --project packages/bot/tsconfig.json` — zero errors.

## Security notes

- No user input is embedded directly into callback_data without typing; `nudgeId` is typed as `number` (numeric, not a string from user input), so no injection risk via the template literal.
- No secrets or environment variables read or used.
- No file I/O, network calls, or database access.
- No `.env` file read.

## Scope compliance

Only `packages/bot/src/keyboard.ts` was created. No other files were modified.
