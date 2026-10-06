const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { Logger } = require('./logger');
const { PROVIDERS } = require('./ai-text-service');

class CredentialManager {
  constructor() {
    this.logger = new Logger('CredentialManager');
    this.credentialsPath = path.join(__dirname, '..', 'config', 'credentials.json');
    this.tokensPath = path.join(__dirname, '..', 'config', 'tokens.json');
    this.credentials = {};
    this.tokens = {};
  }

  async initialize() {
    try {
      await this.loadCredentials();
      await this.loadTokens();
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize credentials:', error);
      return false;
    }
  }

  async loadCredentials() {
    try {
      const data = await fs.readFile(this.credentialsPath, 'utf8');
      this.credentials = JSON.parse(data);
    } catch (error) {
      this.credentials = {};
    }
  }

  async loadTokens() {
    try {
      const data = await fs.readFile(this.tokensPath, 'utf8');
      this.tokens = JSON.parse(data);
    } catch (error) {
      this.tokens = {};
    }
  }

  async saveCredentials() {
    await fs.mkdir(path.dirname(this.credentialsPath), { recursive: true });
    await fs.writeFile(this.credentialsPath, JSON.stringify(this.credentials, null, 2));
  }

  async saveTokens() {
    await fs.mkdir(path.dirname(this.tokensPath), { recursive: true });
    await fs.writeFile(this.tokensPath, JSON.stringify(this.tokens, null, 2));
  }

  // YouTube API Authentication
  async setupYouTubeCredentials() {
    console.log(chalk.cyan('\n🎬 YouTube API Setup'));
    console.log(chalk.gray('You need to create a YouTube Data API project in Google Cloud Console'));
    console.log(chalk.gray('Visit: https://console.cloud.google.com/'));
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'clientId',
        message: 'Enter your YouTube API Client ID:',
        validate: input => input.length > 0 || 'Client ID is required'
      },
      {
        type: 'password',
        name: 'clientSecret',
        message: 'Enter your YouTube API Client Secret:',
        validate: input => input.length > 0 || 'Client Secret is required'
      },
      {
        type: 'input',
        name: 'redirectUri',
        message: 'Enter your redirect URI:',
        default: 'http://localhost:8080/oauth2callback'
      }
    ]);

    this.credentials.youtube = {
      client_id: answers.clientId,
      client_secret: answers.clientSecret,
      redirect_uris: [answers.redirectUri]
    };

    await this.saveCredentials();
    
    // Authenticate and get tokens
    await this.authenticateYouTube();
    
    console.log(chalk.green('✅ YouTube credentials configured successfully!'));
  }

  async authenticateYouTube() {
    const oauth2Client = new google.auth.OAuth2(
      this.credentials.youtube.client_id,
      this.credentials.youtube.client_secret,
      this.credentials.youtube.redirect_uris[0]
    );

    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });

    console.log(chalk.cyan('\n🔗 Please visit this URL to authorize the application:'));
    console.log(chalk.blue(authUrl));

    const { code } = await inquirer.prompt([
      {
        type: 'input',
        name: 'code',
        message: 'Enter the authorization code:',
        validate: input => input.length > 0 || 'Authorization code is required'
      }
    ]);

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    this.tokens.youtube = tokens;
    await this.saveTokens();

    console.log(chalk.green('✅ YouTube authentication completed!'));
  }

  getYouTubeAuth() {
    if (!this.credentials.youtube || !this.tokens.youtube) {
      throw new Error('YouTube credentials not configured. Run: npm run setup');
    }

    const oauth2Client = new google.auth.OAuth2(
      this.credentials.youtube.client_id,
      this.credentials.youtube.client_secret,
      this.credentials.youtube.redirect_uris[0]
    );

    oauth2Client.setCredentials(this.tokens.youtube);
    return oauth2Client;
  }

  getYouTubeClient() {
    const auth = this.getYouTubeAuth();
    return google.youtube({ version: 'v3', auth });
  }

  hasYouTubeScope(scope) {
    const granted = String(this.tokens?.youtube?.scope || '');
    return granted.split(/\s+/).includes(scope);
  }

  // Groq API Setup (the only AI provider for v1)
  async setupGroqCredentials() {
    console.log(chalk.cyan('\n🤖 Groq API Setup'));
    console.log(chalk.gray('Get your API key from: https://console.groq.com/keys'));
    console.log(chalk.gray('Using openai/gpt-oss-120b via Groq\'s OpenAI-compatible endpoint'));

    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your Groq API Key:',
        validate: input => input.startsWith('gsk_') || input.length > 10 || 'Invalid Groq API key format'
      }
    ]);

    this.credentials.aiProvider = {
      provider: 'groq',
      apiKey: answers.apiKey,
      model: PROVIDERS.groq.defaultModel
    };

    // Also set environment variable for the current session
    process.env.GROQ_API_KEY = answers.apiKey;

    await this.saveCredentials();
    console.log(chalk.green('✅ Groq credentials configured successfully!'));
    console.log(chalk.gray(`   Model: ${PROVIDERS.groq.defaultModel}`));
  }

  // Channel Configuration
  async setupChannelConfig() {
    console.log(chalk.cyan('\n📺 Channel Configuration'));
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'channelName',
        message: 'Enter your channel name:',
        validate: input => input.length > 0 || 'Channel name is required'
      },
      {
        type: 'input',
        name: 'channelDescription',
        message: 'Enter channel description:',
        default: 'Automated content channel'
      },
      {
        type: 'input',
        name: 'defaultCategory',
        message: 'Enter default video category ID (22 = People & Blogs):',
        default: '22'
      },
      {
        type: 'input',
        name: 'websiteUrl',
        message: 'Enter your website URL (optional):'
      },
      {
        type: 'input',
        name: 'businessEmail',
        message: 'Enter business email (optional):'
      }
    ]);

    // v1: Privacy is ALWAYS private — not user-configurable
    answers.defaultPrivacy = 'private';

    this.credentials.channel = answers;
    
    this.setEnvIfPresent('CHANNEL_NAME', answers.channelName);
    this.setEnvIfPresent('DEFAULT_PRIVACY_STATUS', 'private');
    this.setEnvIfPresent('WEBSITE_URL', answers.websiteUrl);
    this.setEnvIfPresent('BUSINESS_EMAIL', answers.businessEmail);

    await this.saveCredentials();
    console.log(chalk.green('✅ Channel configuration saved successfully!'));
    console.log(chalk.yellow('   ⚠️  Privacy status locked to "private" for Phase 1'));
  }

  // Content Configuration
  async setupContentConfig() {
    console.log(chalk.cyan('\n📝 Content Configuration'));
    
    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'contentTypes',
        message: 'Select content types to generate:',
        choices: [
          { name: 'Tutorials', value: 'tutorial', checked: true },
          { name: 'Explainers', value: 'explainer', checked: true },
          { name: 'List Videos', value: 'list', checked: true },
          { name: 'Reviews', value: 'review', checked: false },
          { name: 'Stories', value: 'story', checked: false }
        ],
        validate: input => input.length > 0 || 'Select at least one content type'
      },
      {
        type: 'input',
        name: 'competitorChannels',
        message: 'Enter competitor channel IDs (comma-separated):',
        filter: input => input.split(',').map(id => id.trim()).filter(id => id)
      },
      {
        type: 'input',
        name: 'targetAudience',
        message: 'Describe your target audience:',
        default: 'Parents and educators interested in early childhood education'
      },
      {
        type: 'list',
        name: 'postingFrequency',
        message: 'Select posting frequency:',
        choices: [
          { name: 'Daily', value: 'daily' },
          { name: 'Every other day', value: 'every-2-days' },
          { name: '3 times per week', value: '3-per-week' },
          { name: 'Weekly', value: 'weekly' }
        ],
        default: 'weekly'
      },
      {
        type: 'input',
        name: 'preferredPostTime',
        message: 'Preferred posting time (24h format, e.g., 14:00):',
        default: '14:00'
      }
    ]);

    this.credentials.content = answers;
    
    this.setEnvIfPresent('COMPETITOR_CHANNELS', answers.competitorChannels.join(','));
    this.setEnvIfPresent('DEFAULT_AUTHOR', this.credentials.channel?.channelName || 'Content Creator');
    this.setEnvIfPresent('TARGET_AUDIENCE', answers.targetAudience);

    await this.saveCredentials();
    console.log(chalk.green('✅ Content configuration saved successfully!'));
  }

  setEnvIfPresent(key, value) {
    if (value === undefined || value === null || value === '') return;
    process.env[key] = String(value);
  }

  // Validation methods
  hasAITextProvider() {
    if (this.credentials.aiProvider?.apiKey) return true;
    // Environment-variable based configuration
    return Object.values(PROVIDERS).some(p => process.env[p.envKey]);
  }

  getMissingCredentials() {
    const missing = [];
    if (!this.credentials.youtube) missing.push('youtube');
    if (!this.hasAITextProvider()) missing.push('Groq API key');
    return missing;
  }

  async validateAll() {
    try {
      await this.loadCredentials();
      await this.loadTokens();
    } catch (error) {
      // Files might not exist yet
    }

    const missing = this.getMissingCredentials();

    if (missing.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Missing credentials for: ${missing.join(', ')}`));
      console.log(chalk.gray('Run: npm run setup'));
      return false;
    }

    if (!this.tokens.youtube) {
      console.log(chalk.yellow('\n⚠️  YouTube authentication required'));
      return false;
    }

    return true;
  }

  async testConnections() {
    console.log(chalk.cyan('\n🔍 Testing API connections...'));
    
    const results = { youtube: false, groq: false };

    // Test YouTube API
    try {
      const youtube = this.getYouTubeClient();
      await youtube.channels.list({ part: 'snippet', mine: true });
      results.youtube = true;
      console.log(chalk.green('✅ YouTube API connection successful'));
    } catch (error) {
      console.log(chalk.red('❌ YouTube API connection failed'));
      this.logger.error('YouTube API test failed:', error);
    }

    // Test Groq API
    if (this.hasAITextProvider()) {
      try {
        const OpenAI = require('openai');
        const apiKey = this.credentials.aiProvider?.apiKey || process.env.GROQ_API_KEY;
        const client = new OpenAI({ apiKey, baseURL: PROVIDERS.groq.baseURL });
        await client.models.list();
        results.groq = true;
        console.log(chalk.green('✅ Groq API connection successful'));
      } catch (error) {
        console.log(chalk.red('❌ Groq API connection failed'));
        this.logger.error('Groq API test failed:', error);
      }
    }

    return results;
  }

  // Setup wizard
  async runSetupWizard() {
    console.log(chalk.cyan.bold('\n🚀 SpacECE YouTube Automation — Setup Wizard'));
    console.log(chalk.gray('Let\'s configure your credentials and settings...\n'));

    const setupSteps = [
      { name: '🎬 YouTube API', action: () => this.setupYouTubeCredentials() },
      { name: '🤖 Groq AI Service', action: () => this.setupGroqCredentials() },
      { name: '📺 Channel Configuration', action: () => this.setupChannelConfig() },
      { name: '📝 Content Configuration', action: () => this.setupContentConfig() }
    ];

    for (const step of setupSteps) {
      console.log(chalk.cyan(`\n${step.name}`));
      await step.action();
    }

    console.log(chalk.green.bold('\n🎉 Setup completed successfully!'));
    console.log(chalk.cyan('You can now run: npm start'));
    
    await this.testConnections();
  }
}

// CLI interface for credential setup
if (require.main === module) {
  const credentialManager = new CredentialManager();
  
  const args = process.argv.slice(2);
  if (args.includes('setup')) {
    credentialManager.runSetupWizard().catch(console.error);
  } else {
    console.log('Usage: node credential-manager.js setup');
  }
}

module.exports = { CredentialManager };
