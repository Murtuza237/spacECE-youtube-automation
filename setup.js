require('dotenv').config();

const { CredentialManager } = require('./utils/credential-manager');
const { Database } = require('./database/db');
const { Logger } = require('./utils/logger');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

class YouTubeAutomationSetup {
  constructor() {
    this.logger = new Logger('Setup');
    this.credentialManager = new CredentialManager();
    this.database = new Database();
  }

  async run() {
    console.log(chalk.cyan.bold('\n🎬 SpacECE YouTube Automation — Setup'));
    console.log(chalk.gray('═'.repeat(60)));
    console.log(chalk.cyan('Welcome to the SpacECE YouTube Automation setup wizard!'));
    console.log(chalk.gray('This will configure your system for the core content pipeline.\n'));
    console.log(chalk.yellow('⚠️  Phase 1: Personal account testing only'));
    console.log(chalk.yellow('   All uploads will be set to PRIVATE\n'));

    try {
      // Step 1: Create directories
      await this.createDirectories();
      
      // Step 2: Initialize in-memory database
      await this.database.initialize();
      
      // Step 3: Run credential setup (Groq + YouTube only)
      await this.credentialManager.runSetupWizard();
      
      // Step 4: Create environment file if needed
      await this.createEnvironmentFile();
      
      // Step 5: Final validation
      await this.validateSetup();
      
      console.log(chalk.green.bold('\n🎉 Setup completed successfully!'));
      console.log(chalk.cyan('\n📋 Next steps:'));
      console.log(chalk.white('1. Run: npm start'));
      console.log(chalk.white('   (or: node run-pipeline.js --topic "Early Childhood Education Tips")'));
      console.log(chalk.white('2. The pipeline will generate content and pause before publishing'));
      console.log(chalk.white('3. Confirm the publish step when prompted'));
      console.log(chalk.white('4. Check YouTube Studio to verify the video is Private'));
      
      console.log(chalk.gray('\n═'.repeat(60)));
      console.log(chalk.yellow('🤖 Your SpacECE content pipeline is ready!'));

    } catch (error) {
      console.log(chalk.red.bold('\n❌ Setup failed!'));
      console.log(chalk.red(error.message));
      process.exit(1);
    }
  }

  async createDirectories() {
    console.log(chalk.cyan('\n📁 Creating directory structure...'));
    
    const directories = [
      'config',
      'data',
      'data/production',
      'data/assets',
      'data/videos',
      'data/audio',
      'data/scripts',
      'data/captions',
      'data/thumbnails',
      'temp/processing',
      'uploads/thumbnails',
      'schedules',
      'logs'
    ];

    for (const dir of directories) {
      await fs.mkdir(path.join(__dirname, dir), { recursive: true });
    }

    console.log(chalk.green('✅ Directory structure created'));
  }

  async createEnvironmentFile() {
    const envPath = path.join(__dirname, '.env');
    
    try {
      await fs.access(envPath);
      console.log(chalk.gray('\n.env file already exists, skipping creation'));
    } catch (error) {
      // .env doesn't exist, create from example
      const examplePath = path.join(__dirname, '.env.example');
      try {
        const example = await fs.readFile(examplePath, 'utf8');
        
        // Fill in Groq key if available
        let envContent = example;
        if (process.env.GROQ_API_KEY) {
          envContent = envContent.replace('GROQ_API_KEY=', `GROQ_API_KEY=${process.env.GROQ_API_KEY}`);
        }
        
        await fs.writeFile(envPath, envContent);
        console.log(chalk.green('\n✅ .env file created from .env.example'));
      } catch (err) {
        console.log(chalk.yellow('\n⚠️  Could not create .env file — create it manually from .env.example'));
      }
    }
  }

  async validateSetup() {
    console.log(chalk.cyan('\n🔍 Validating setup...'));
    
    const checks = [];

    // Check config directory
    try {
      await fs.access(path.join(__dirname, 'config'));
      checks.push({ name: 'Config directory', status: true });
    } catch (error) {
      checks.push({ name: 'Config directory', status: false });
    }

    // Check Groq API key
    const hasGroq = this.credentialManager.hasAITextProvider();
    checks.push({ name: 'Groq API key', status: hasGroq });

    // Check YouTube credentials
    const hasYouTube = !!this.credentialManager.credentials.youtube;
    checks.push({ name: 'YouTube credentials', status: hasYouTube });

    // Check privacy setting
    const privacyOk = (process.env.DEFAULT_PRIVACY_STATUS || 'private') === 'private';
    checks.push({ name: 'Privacy status = private', status: privacyOk });

    // Display results
    for (const check of checks) {
      const icon = check.status ? chalk.green('✅') : chalk.red('❌');
      console.log(`  ${icon} ${check.name}`);
    }

    const allPassed = checks.every(c => c.status);
    if (!allPassed) {
      console.log(chalk.yellow('\n⚠️  Some checks failed — the pipeline may not work correctly'));
    }

    return allPassed;
  }
}

// CLI entry point
if (require.main === module) {
  const setup = new YouTubeAutomationSetup();
  setup.run().catch(error => {
    console.error(chalk.red('Setup error:', error.message));
    process.exit(1);
  });
}

module.exports = { YouTubeAutomationSetup };
