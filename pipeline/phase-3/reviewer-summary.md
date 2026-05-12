**Phase 3 — People Graph, Life Events & Nudges**

**⚠️ Security-sensitive tasks**
- task-10 (Create scheduler module with nudge evaluator): Scheduler runs background jobs that query and modify nudge records; rate limiting logic must prevent abuse
- task-12 (Add nudge sending capability to scheduler): Sends messages via Telegram bot; must validate chat ID and handle failed sends safely

**What this phase builds**
Expands the people management system with life event tracking (birthdays, anniversaries) and a proactive nudge system that automatically reminds users of upcoming events. The scheduler runs every 15 minutes to evaluate due nudges and send them via Telegram with dismiss buttons. Users can log interactions and see upcoming life events in person profiles.

**Tasks (16 total)**
1. Create database migration for life_events table
2. Create database migration for nudges table
3. Update people table schema to match architecture
4. Add log_interaction tool to people module
5. Create life events tools module
6. Create nudges tools module
7. Add life events and nudges tool definitions to agent
8. Add log_interaction tool definition to agent
9. Update people.ts to include life events in get_person response
10. Create scheduler module with nudge evaluator
11. Add automatic nudge creation for life events
12. Add nudge sending capability to scheduler
13. Add dismiss nudge callback handling
14. Add dismiss-nudge endpoint to orchestrator
15. Initialize scheduler in orchestrator startup
16. Update shared types for Phase 3 data structures

**Exit criteria**
- All 16 tasks completed and tested
- Database migrations run successfully
- Scheduler starts on orchestrator boot and evaluates nudges every 15 minutes
- Nudges send via Telegram with dismiss buttons
- Life events appear in person profiles with recurring date adjustment
- Interaction logging works and updates last_interaction_at
- All new tools integrated into agent tool loop
- Type safety maintained across all new data structures

**Concerns or risks**
- **task-11 AC-5 (vague language)**: "Function continues to work if nudge creation fails (logs error but doesn't fail life event creation)" — unclear what "doesn't fail" means. Does it mean the life event is created even if nudge creation throws? Should nudge creation errors be caught and logged, or should they propagate? Needs clarification on error handling strategy.
- No high-complexity tasks detected.
- Dependency chain is well-ordered; no blocking risks identified.

**To proceed, reply:**
`approve` · `changes: [what to change]` · `stop`
