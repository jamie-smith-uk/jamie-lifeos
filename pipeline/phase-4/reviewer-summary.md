**Phase 4 — Strava Integration**

**⚠️ Security-sensitive tasks**
- **task-1**: Stores OAuth tokens and refresh tokens in database; requires secure encryption and access controls
- **task-3**: Manages Strava API credentials (client ID, secret); must be protected from exposure in logs or version control
- **task-4**: Implements OAuth state management and token refresh logic; CSRF protection and token validation are critical
- **task-5**: Handles OAuth callback and credential exchange; validates state tokens and stores sensitive tokens
- **task-6**: Syncs activities after OAuth completion; manages token refresh and API authentication
- **task-7**: Runs scheduled sync job with automatic token refresh; must securely manage credential updates

**What this phase builds**
Phase 4 implements full Strava integration, enabling users to connect their Strava account via OAuth, sync 90 days of historical activities, and receive ongoing 30-minute syncs. The agent gains access to activity queries, trend analysis, and activity snapshots for day planning context.

**Tasks (9 total)**
1. Create strava_credentials table migration with athlete_id, tokens, expiration, and sync tracking
2. Create strava_activities table migration with activity metrics and foreign key to credentials
3. Add STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI to environment config
4. Build Strava tools module with OAuth URL generation, activity queries, and trend analysis functions
5. Add OAuth callback endpoint to bot service for authorization code exchange and credential storage
6. Implement 90-day historical activity sync with pagination after successful OAuth connection
7. Add 30-minute cron job to scheduler for ongoing activity sync and token refresh
8. Register get_strava_oauth_url, get_strava_activities, and get_strava_trends tools in agent registry
9. Add last 7 days activity snapshot to agent system prompt for day planning context

**Exit criteria**
- OAuth connection flow with CSRF protection via state tokens
- 90-day historical activity sync on first connection with pagination
- 30-minute ongoing sync job with automatic token refresh
- Activity queries filtered by sport type and date range
- Trend analysis for weekly volume and pace
- Activity snapshot in agent system prompt for planning context

**Concerns or risks**
- **task-4 AC-3**: Vague outcome — "analyzes weekly volume and pace trends" lacks specific metrics, thresholds, or format for what constitutes successful analysis
- **task-4 AC-5**: Ambiguous requirement — "handles gracefully" is subjective without specifying expected behavior (retry logic, error messages, logging level, etc.)
- **task-5 AC-4**: Unclear verification — "Telegram confirmation message sent with athlete name" doesn't specify required message format, content, or how to confirm delivery
- **task-6 AC-4**: Ambiguous outcome — "Sends Telegram message with count of imported activities" lacks specificity about message format and content requirements
- **task-9 AC-4**: Vague requirement — "Activity snapshot is formatted for agent context" lacks specific format specifications, field order, or structure definition

**To proceed, reply:**
`changes: clarify AC-3, AC-4, AC-5 acceptance criteria with specific formats and thresholds` · `stop`
