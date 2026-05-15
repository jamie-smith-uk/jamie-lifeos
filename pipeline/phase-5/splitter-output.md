# Ticket Splitter Output

## Summary
6 task(s) split into 12 sub-tasks. 2 tasks unchanged.

## Splits performed

### task-3 → task-3a, task-3b
**Reason**: 5 ACs (>4), 4 files (>3)
- task-3a: Implement voice transcription tool core function with Telegram download and Whisper API integration
- task-3b: Add voice transcription tool tests and validation for file formats and API responses

### task-4 → task-4a, task-4b
**Reason**: 5 ACs (>4), 4 files (>3)
- task-4a: Implement pending voice intent creation and reading with 5-minute expiration
- task-4b: Add pending voice intent management tests including expiration scenarios

### task-5 → task-5a, task-5b
**Reason**: 5 ACs (>4), 4 files (>3)
- task-5a: Implement voice confirmation keyboard builder with Yes/No buttons
- task-5b: Add voice keyboard builder tests and Telegram format validation

### task-6 → task-6a, task-6b
**Reason**: 6 ACs (>4), 4 files (>3)
- task-6a: Implement voice message detection in bot handler with transcription integration
- task-6b: Add voice confirmation message and keyboard to bot handler with error handling

### task-7 → task-7a, task-7b
**Reason**: 6 ACs (>4), 4 files (>3)
- task-7a: Implement voice_yes callback handler with intent loading and expiration checking
- task-7b: Implement voice_no callback handler and add comprehensive tests for both handlers

### task-8 → task-8a, task-8b
**Reason**: 5 ACs (>4), 4 files (>3)
- task-8a: Register voice tools in orchestrator agent with proper imports and definitions
- task-8b: Add voice tools integration tests with agent system

## Tasks unchanged
- task-1: Already low complexity with 1 file and 7 ACs (ACs are atomic schema definitions, not splitting criteria)
- task-2: Already low complexity with 4 files and 3 ACs (≤4 ACs threshold)

## Dependency chain notes
- Split groups maintain linear dependency chains (e.g., task-3a → task-3b → task-4a)
- Original task dependencies preserved: task-3 dependencies → task-3b (last sub-task)
- task-4 dependencies updated: task-1 → task-4a, task-3b → task-4a
- task-6 dependencies updated: task-3b, task-4b → task-6a
- task-7 dependencies updated: task-4b, task-6b → task-7a
- task-8 dependencies updated: task-3b, task-4b → task-8a
