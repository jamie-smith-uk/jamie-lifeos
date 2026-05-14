# Ticket Splitter Output

## Summary
8 task(s) split into 16 sub-tasks. 1 task unchanged.

## Splits performed

### task-1 → task-1a, task-1b
**Reason**: 9 acceptance criteria exceeds threshold of 4
- task-1a: Create strava_credentials table with core identity and token columns (id, athlete_id, access_token, refresh_token)
- task-1b: Add token expiry and sync tracking columns (expires_at, scope, last_synced_at, created_at, updated_at)

### task-2 → task-2a, task-2b
**Reason**: 18 acceptance criteria exceeds threshold of 4
- task-2a: Create strava_activities table with core activity fields (id, strava_id, athlete_id, name, sport_type, start_date)
- task-2b: Add performance metrics columns (distance, time, elevation, speed, heart rate, power, raw data, synced_at)

### task-4 → task-4a, task-4b
**Reason**: 6 acceptance criteria exceeds threshold of 4; 4 files exceeds threshold of 3
- task-4a: Create Strava tools module with OAuth URL generation and state management
- task-4b: Add activity query and trend analysis functions with token refresh logic

### task-5 → task-5a, task-5b
**Reason**: 5 acceptance criteria exceeds threshold of 4; 4 files exceeds threshold of 3
- task-5a: Create OAuth callback endpoint structure with state token validation
- task-5b: Implement token exchange and credential storage in OAuth callback

### task-6 → task-6a, task-6b
**Reason**: 5 acceptance criteria exceeds threshold of 4; 4 files exceeds threshold of 3
- task-6a: Implement 90-day activity fetch from Strava API with pagination
- task-6b: Store and confirm initial activity sync with Telegram notification

### task-7 → task-7a, task-7b
**Reason**: 5 acceptance criteria exceeds threshold of 4; 4 files exceeds threshold of 3
- task-7a: Create Strava sync job function with token refresh logic
- task-7b: Register Strava sync job in scheduler as 30-minute cron job

### task-8 → task-8a, task-8b
**Reason**: 5 acceptance criteria exceeds threshold of 4; 4 files exceeds threshold of 3
- task-8a: Register OAuth and activity query tools in agent tool definitions
- task-8b: Register trend analysis tool and verify agent integration

### task-9 → task-9a, task-9b
**Reason**: 5 acceptance criteria exceeds threshold of 4; 4 files exceeds threshold of 3
- task-9a: Query last 7 days activity summary and format for context
- task-9b: Format and integrate activity snapshot into agent system prompt

## Tasks unchanged
- task-3: Already at threshold (4 ACs, 4 files) — no split needed

## Dependency chain notes
- Database tasks form a linear chain: task-1a → task-1b → task-2a → task-2b
- Configuration (task-3) remains independent
- Tools module split into OAuth (task-4a) and query/trends (task-4b)
- OAuth callback split into validation (task-5a) and storage (task-5b)
- Initial sync split into fetch (task-6a) and storage (task-6b)
- Scheduler split into job function (task-7a) and cron registration (task-7b)
- Agent registration split into core tools (task-8a) and trends/verification (task-8b)
- Context integration split into query (task-9a) and formatting (task-9b)
- All downstream dependencies updated to reference final sub-task in each chain
