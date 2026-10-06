#!/usr/bin/env node

/**
 * SpacECE YouTube Automation Pipeline — v1 Orchestrator
 *
 * Runs the 7 core agents sequentially in one process invocation:
 *   Strategy → Script → Thumbnail → SEO → Production → Publish → Analytics
 *
 * Usage:
 *   node run-pipeline.js                                    # Uses default SpacECE topic
 *   node run-pipeline.js --topic "Early Childhood Education Tips"
 *   node run-pipeline.js --skip-publish                     # Stop before publishing
 */

require('dotenv').config();

const chalk = require('chalk');
const inquirer = require('inquirer');
const { Logger } = require('./utils/logger');
const { CredentialManager } = require('./utils/credential-manager');
const { Database } = require('./database/db');

// Core agents
const { ContentStrategyAgent } = require('./agents/content-strategy-agent');
const { ScriptWriterAgent } = require('./agents/script-writer-agent');
const { ThumbnailDesignerAgent } = require('./agents/thumbnail-designer-agent');
const { SEOOptimizerAgent } = require('./agents/seo-optimizer-agent');
const { ProductionManagementAgent } = require('./agents/production-management-agent');
const { PublishingSchedulingAgent } = require('./agents/publishing-scheduling-agent');
const { AnalyticsOptimizationAgent } = require('./agents/analytics-optimization-agent');

const logger = new Logger('Pipeline');

// ─── CLI argument parsing ──────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    topic: null,
    skipPublish: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--topic' && args[i + 1]) {
      options.topic = args[++i];
    } else if (args[i] === '--skip-publish') {
      options.skipPublish = true;
    }
  }

  return options;
}

// ─── Stage runner helper ───────────────────────────────────────────────────

async function runStage(name, emoji, fn) {
  console.log(chalk.cyan(`\n${'─'.repeat(60)}`));
  console.log(chalk.cyan.bold(`${emoji}  Stage: ${name}`));
  console.log(chalk.cyan('─'.repeat(60)));

  const start = Date.now();
  try {
    const result = await fn();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(chalk.green(`✅ ${name} completed in ${elapsed}s`));
    return result;
  } catch (error) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(chalk.red(`❌ ${name} failed after ${elapsed}s: ${error.message}`));
    throw error;
  }
}

// ─── Main pipeline ─────────────────────────────────────────────────────────

async function main() {
  const options = parseArgs();
  const defaultTopic = 'How SpacECE Is Transforming Early Childhood Education';
  const topic = options.topic || defaultTopic;

  console.log(chalk.cyan.bold('\n🚀 SpacECE YouTube Automation Pipeline — v1'));
  console.log(chalk.gray('═'.repeat(60)));
  console.log(chalk.white(`📋 Topic: ${topic}`));
  console.log(chalk.white(`🎥 Video path: slideshow (local FFmpeg)`));
  console.log(chalk.white(`🤖 AI provider: Groq (openai/gpt-oss-120b)`));
  console.log(chalk.white(`🔒 Privacy: PRIVATE (Phase 1)`));
  console.log(chalk.gray('═'.repeat(60)));

  // ── Initialize infrastructure ──────────────────────────────────────────

  const credentials = new CredentialManager();
  const initialized = await credentials.initialize();
  if (!initialized) {
    console.log(chalk.yellow('\n⚠️  Credentials not configured. Run: npm run setup'));
    process.exit(1);
  }

  const db = new Database();
  await db.initialize();

  // ── Instantiate agents ─────────────────────────────────────────────────

  const contentStrategy = new ContentStrategyAgent(db, credentials);
  const scriptWriter = new ScriptWriterAgent(db, credentials);
  const thumbnailDesigner = new ThumbnailDesignerAgent(db, credentials);
  const seoOptimizer = new SEOOptimizerAgent(db, credentials);
  const productionMgmt = new ProductionManagementAgent(db, credentials);
  const publisher = new PublishingSchedulingAgent(db, credentials);
  const analytics = new AnalyticsOptimizationAgent(db, credentials);

  // ── Initialize agents ──────────────────────────────────────────────────

  await runStage('Initialize Agents', '⚙️', async () => {
    await contentStrategy.initialize();
    await scriptWriter.initialize();
    await thumbnailDesigner.initialize();
    await seoOptimizer.initialize();
    await productionMgmt.initialize();
    await publisher.initialize();
    await analytics.initialize();
    logger.info('All 7 agents initialized');
  });

  // ── Stage 1: Content Strategy ──────────────────────────────────────────

  const strategy = await runStage('Content Strategy', '📊', async () => {
    const result = await contentStrategy.generateContentStrategy(topic);
    console.log(chalk.gray(`   Topic: ${result.topic}`));
    console.log(chalk.gray(`   Angle: ${result.angle}`));
    console.log(chalk.gray(`   Type: ${result.contentType}`));
    console.log(chalk.gray(`   Keywords: ${(result.keywords || []).join(', ')}`));
    return result;
  });

  // ── Stage 2: Script Writing ────────────────────────────────────────────

  const script = await runStage('Script Writing', '📝', async () => {
    const result = await scriptWriter.generateScript(strategy);
    console.log(chalk.gray(`   Title: ${result.title}`));
    console.log(chalk.gray(`   Duration: ${result.duration}`));
    console.log(chalk.gray(`   Sections: ${result.mainContent?.sections?.length || 0}`));
    return result;
  });

  // ── Stage 3: Thumbnail Design ──────────────────────────────────────────

  const thumbnail = await runStage('Thumbnail Design', '🎨', async () => {
    const result = await thumbnailDesigner.generateThumbnail(script);
    console.log(chalk.gray(`   Path: ${result.path}`));
    console.log(chalk.gray(`   Size: ${result.fileSize} bytes`));
    return result;
  });

  // ── Stage 4: SEO Optimization ──────────────────────────────────────────

  const seo = await runStage('SEO Optimization', '🔍', async () => {
    const result = await seoOptimizer.optimize(script, strategy);
    console.log(chalk.gray(`   Optimized title: ${result.title}`));
    console.log(chalk.gray(`   SEO score: ${result.seoScore}/100`));
    console.log(chalk.gray(`   Tags: ${result.tags.length}`));
    return result;
  });

  // ── Stage 5: Production ────────────────────────────────────────────────

  const production = await runStage('Production Management', '🎬', async () => {
    const result = await productionMgmt.processContent({
      strategy,
      script,
      thumbnail,
      seo,
    });
    console.log(chalk.gray(`   Production ID: ${result.id}`));
    console.log(chalk.gray(`   Status: ${result.status}`));
    console.log(chalk.gray(`   Scheduled: ${result.scheduledPublishTime}`));
    return result;
  });

  seoOptimizer.appendAttribution(production);

  // ── Pre-publish summary ────────────────────────────────────────────────

  console.log(chalk.cyan('\n' + '═'.repeat(60)));
  console.log(chalk.cyan.bold('📋 Pipeline Summary'));
  console.log(chalk.cyan('═'.repeat(60)));
  console.log(chalk.white(`  Topic:        ${strategy.topic}`));
  console.log(chalk.white(`  Title:        ${seo.title}`));
  console.log(chalk.white(`  Video status: ${production.status}`));
  console.log(chalk.white(`  Privacy:      PRIVATE`));
  console.log(chalk.white(`  SEO score:    ${seo.seoScore}/100`));
  console.log(chalk.cyan('═'.repeat(60)));

  if (options.skipPublish) {
    console.log(chalk.yellow('\n⏭️  Skipping publish step (--skip-publish flag)'));
    await db.persist();
    console.log(chalk.green('\n✅ Pipeline completed (publish skipped)'));
    return;
  }

  if (production.status === 'simulated') {
    console.log(chalk.yellow('\n⚠️  Production generated PLACEHOLDER assets only.'));
    console.log(chalk.yellow('   The video cannot be uploaded until real assets are produced.'));
    console.log(chalk.yellow('   Check FFmpeg installation and Groq API key.'));
    await db.persist();
    return;
  }

  // ── Human-in-the-loop approval gate ────────────────────────────────────

  console.log(chalk.yellow.bold('\n🛑 PUBLISH APPROVAL GATE'));
  console.log(chalk.yellow('   The video will be uploaded as PRIVATE to your personal YouTube channel.'));

  const { proceed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Proceed with publishing to YouTube?',
      default: false,
    },
  ]);

  if (!proceed) {
    console.log(chalk.yellow('\n⏹️  Publishing cancelled by user'));
    await db.persist();
    return;
  }

  // ── Stage 6: Schedule & Publish ────────────────────────────────────────

  let publishResult = null;

  await runStage('Schedule Content', '📅', async () => {
    const schedule = await publisher.scheduleContent(production);
    if (!schedule) {
      console.log(chalk.yellow('   Scheduling returned null — video may not be uploadable'));
      return null;
    }
    console.log(chalk.gray(`   Scheduled for: ${schedule.publishTime}`));
    return schedule;
  });

  publishResult = await runStage('Publish Content', '📤', async () => {
    const result = await publisher.publishContent(production.id);
    if (result && result.youtubeUrl) {
      console.log(chalk.green(`   YouTube URL: ${result.youtubeUrl}`));
      console.log(chalk.green(`   Status: ${result.status}`));
    }
    return result;
  });

  // ── Stage 7: Analytics (optional) ──────────────────────────────────────

  if (publishResult && publishResult.youtubeId) {
    try {
      await runStage('Analytics Snapshot', '📈', async () => {
        const report = await analytics.analyzeVideoPerformance(publishResult.youtubeId);
        console.log(chalk.gray(`   Performance score: ${report.performance?.score || 'N/A'}/100`));
        return report;
      });
    } catch (error) {
      console.log(chalk.yellow(`\n⚠️  Analytics not available yet (video just uploaded): ${error.message}`));
    }
  }

  // ── Persist and finish ─────────────────────────────────────────────────

  await db.persist();

  console.log(chalk.green.bold('\n' + '═'.repeat(60)));
  console.log(chalk.green.bold('🎉 Pipeline completed successfully!'));
  console.log(chalk.green.bold('═'.repeat(60)));

  if (publishResult && publishResult.youtubeUrl) {
    console.log(chalk.cyan(`\n🔗 Video: ${publishResult.youtubeUrl}`));
    console.log(chalk.yellow('   Reminder: Verify in YouTube Studio that the video is PRIVATE'));
  }
}

// ─── Entry point ───────────────────────────────────────────────────────────

main().catch(error => {
  console.error(chalk.red('\n💥 Pipeline failed:'), error.message);
  logger.error('Pipeline fatal error:', error);
  process.exit(1);
});
