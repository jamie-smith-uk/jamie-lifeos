**Phase 5 — Voice Message Input & Transcription**

**⚠️ Security-sensitive tasks**
- task-2: OPENAI_API_KEY must be validated and protected as a required secret in environment configuration
- task-3: Voice transcription tool handles API keys and downloads files from Telegram; requires secure credential management and input validation
- task-6: Bot message handler processes user voice input and calls transcription service; must validate file integrity and handle API failures safely

**What this phase builds**
Phase 5 adds voice message input to the Telegram bot, enabling users to send voice messages that are transcribed via OpenAI Whisper API and confirmed before execution. The implementation includes database storage for pending intents, a 5-minute expiration mechanism, and a confirmation flow with Yes/No buttons. Voice transcriptions integrate seamlessly into the existing agent workflow with proper error handling.

**Tasks (8 total)**
1. Create pending_voice_intents table migration with chat_id, transcription, telegram_file_id, expires_at, and created_at columns
2. Add OPENAI_API_KEY to environment configuration and .env.example
3. Implement voice transcription tool that downloads Telegram files and calls OpenAI Whisper API
4. Add database tools for creating, reading, and deleting pending voice intents with 5-minute expiration
5. Build voice confirmation keyboard with Yes/No buttons containing callback data
6. Extend bot message handler to detect voice messages, transcribe them, and send confirmations
7. Implement callback handlers for voice_yes and voice_no actions with expiration checks
8. Register voice tools in orchestrator agent tool registry

**Exit criteria**
- All voice transcription requests complete within 3 seconds
- Pending intents expire after 5 minutes and are cleaned up on access
- Users receive confirmation message with transcription text before execution
- Yes/No inline keyboard responses properly route to callback handlers
- Expired intents are rejected with appropriate user message
- Transcription failures send friendly error messages to users
- Voice transcriptions flow through agent with [voice] prefix for context
- All tools are properly typed and integrated with existing agent system

**Concerns or risks**
- **task-3 AC-4**: "Gracefully" is ambiguous — unclear what constitutes graceful error handling or how to verify it
- **task-3 AC-5**: "Validates" is vague — no specific validation rules or error conditions defined
- **task-5 AC-5**: "Matches format" is ambiguous — no specific format details or validation criteria provided
- **task-6 AC-4**: "Confirmation message" is vague — no specific message content or format requirements defined
- **task-6 AC-6**: "Friendly error message" is subjective — unclear what makes a message "friendly" or how to verify it
- **task-8 AC-5**: "Properly typed" and "properly integrated" are ambiguous — no specific type definitions or integration requirements stated

**To proceed, reply:**
`approve` · `changes: [what to change]` · `stop`
