#!/usr/bin/env node

/**
 * Phase 1 Smoke Tests
 * 
 * Basic smoke tests to verify the Phase 1 exit criteria.
 * These tests check that the core functionality is working without
 * requiring actual Telegram or external API calls.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

console.log('🧪 Phase 1 Smoke Tests');
console.log('======================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    failed++;
  }
}

// Test 1: Check that all required files exist
test('Required files exist', () => {
  const requiredFiles = [
    'packages/bot/src/index.ts',
    'packages/bot/src/middleware.ts', 
    'packages/bot/src/keyboard.ts',
    'packages/orchestrator/src/index.ts',
    'packages/orchestrator/src/agent.ts',
    'packages/orchestrator/src/tools/calendar.ts',
    'packages/shared/src/db.ts',
    'packages/shared/src/env.ts',
    'packages/shared/src/logger.ts',
    'packages/shared/src/types.ts',
    'packages/shared/src/migrate.ts',
    'db/migrations/0001_init.sql',
    '.env.example',
    'railway.json'
  ];

  for (const file of requiredFiles) {
    try {
      readFileSync(file);
    } catch (error) {
      throw new Error(`Missing file: ${file}`);
    }
  }
});

// Test 2: Check TypeScript compilation
test('TypeScript compilation passes', () => {
  try {
    execSync('pnpm typecheck', { stdio: 'pipe' });
  } catch (error) {
    throw new Error('TypeScript compilation failed');
  }
});

// Test 3: Check that all tests pass
test('All unit tests pass', () => {
  try {
    execSync('pnpm test', { stdio: 'pipe' });
  } catch (error) {
    throw new Error('Unit tests failed');
  }
});

// Test 4: Check .env.example has required variables
test('.env.example contains required variables', () => {
  const envExample = readFileSync('.env.example', 'utf8');
  const requiredVars = [
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_ALLOWED_CHAT_ID', 
    'ANTHROPIC_API_KEY',
    'DATABASE_URL',
    'DIGEST_CRON',
    'TZ'
  ];

  for (const varName of requiredVars) {
    if (!envExample.includes(varName)) {
      throw new Error(`Missing environment variable: ${varName}`);
    }
  }
});

// Test 5: Check database migration exists
test('Database migration exists and is valid', () => {
  const migration = readFileSync('db/migrations/0001_init.sql', 'utf8');
  
  // Check for required tables and columns
  if (!migration.includes('conversation_context')) {
    throw new Error('Missing conversation_context table');
  }
  if (!migration.includes('active_confirmation')) {
    throw new Error('Missing active_confirmation column');
  }
  if (!migration.includes('idx_conversation_context_chat_id_created_at')) {
    throw new Error('Missing required index');
  }
});

// Test 6: Check Railway deployment configuration
test('Railway deployment configuration exists', () => {
  const railwayConfig = JSON.parse(readFileSync('railway.json', 'utf8'));
  
  if (!railwayConfig.services) {
    throw new Error('Missing services configuration');
  }
  
  const services = Object.keys(railwayConfig.services);
  if (!services.includes('bot')) {
    throw new Error('Missing bot service configuration');
  }
  if (!services.includes('orchestrator')) {
    throw new Error('Missing orchestrator service configuration');
  }
});

// Test 7: Check that build succeeds
test('Build succeeds', () => {
  try {
    execSync('pnpm build', { stdio: 'pipe' });
  } catch (error) {
    throw new Error('Build failed');
  }
});

console.log('\n📊 Results');
console.log('===========');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Total:  ${passed + failed}`);

if (failed === 0) {
  console.log('\n🎉 All smoke tests passed! Phase 1 implementation is ready.');
  process.exit(0);
} else {
  console.log('\n💥 Some smoke tests failed. Please fix the issues above.');
  process.exit(1);
}