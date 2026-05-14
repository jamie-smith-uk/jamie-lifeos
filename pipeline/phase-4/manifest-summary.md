# Phase 4 Task Manifest Summary

## Overview
Phase 4 implements Strava integration, allowing users to connect their Strava account, sync activities, and query their training data through the Life OS agent.

## Task Breakdown (9 tasks)

### Database Foundation (Tasks 1-2)
- **Task 1**: Create `strava_credentials` table migration for storing OAuth tokens and athlete data
- **Task 2**: Create `strava_activities` table migration for storing activity data with foreign key to credentials

### Configuration (Task 3)
- **Task 3**: Add Strava OAuth environment variables (client ID, secret, redirect URI) to shared config

### Core Integration (Tasks 4-6)
- **Task 4**: Build Strava tools module with OAuth URL generation, activity queries, and trend analysis
- **Task 5**: Add OAuth callback endpoint to bot service for authorization code exchange
- **Task 6**: Implement 90-day historical activity sync after successful OAuth connection

### Automation & Agent Integration (Tasks 7-9)
- **Task 7**: Add 30-minute sync job to scheduler with automatic token refresh
- **Task 8**: Register Strava tools in agent tool registry for user queries
- **Task 9**: Include activity snapshot in agent system prompt for day planning context

## Security Considerations
Tasks 1, 3, 4, 5, 6, and 7 are marked as security-sensitive due to:
- OAuth token handling and storage
- External API authentication
- CSRF protection with state tokens
- Automatic token refresh mechanisms

## Dependencies
The tasks follow a logical dependency chain:
- Database migrations (1-2) → Environment config (3) → Core tools (4) → OAuth flow (5) → Historical sync (6) → Scheduled sync (7)
- Agent integration (8-9) depends on core tools being available

## Exit Criteria Alignment
This manifest covers all Phase 4 exit criteria:
- OAuth connection flow with CSRF protection
- 90-day historical sync and 30-minute ongoing sync
- Activity queries, totals, and trend analysis
- Integration with agent system prompt for day planning context