# SpacECE YouTube Automation Pipeline (v1)

Automated YouTube content pipeline for SpacECE, powered by 7 AI agents and Groq's Llama 3.3 70B.

## Architecture

The pipeline runs 7 agents sequentially in a single process invocation:

```
Content Strategy → Script Writer → Thumbnail Designer → SEO Optimizer
    → Production Management → Publishing & Scheduling → Analytics
```

### v1 Constraints
- **AI Provider:** Groq only (via OpenAI-compatible SDK)
- **Video Rendering:** Local slideshow (FFmpeg) — no paid video generation
- **Privacy:** All uploads are **private** (Phase 1 personal-account testing)
- **Database:** In-memory stub (no SQLite dependency)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run the setup wizard (configures Groq API key + YouTube OAuth)
npm run setup

# 3. Run the full pipeline
npm start
# or with a specific topic:
node run-pipeline.js --topic "Early Childhood Education Tips"
```

## Setup

### Prerequisites
- Node.js >= 18.0.0
- FFmpeg (installed via system PATH or bundled via `ffmpeg-static`)
- A Google Cloud project with YouTube Data API v3 enabled
- A Groq API key ([console.groq.com](https://console.groq.com/keys))

### Configuration

1. **Groq API Key** — Get one at [console.groq.com/keys](https://console.groq.com/keys)
2. **YouTube OAuth** — Create credentials in [Google Cloud Console](https://console.cloud.google.com/)
   - Enable: YouTube Data API v3, YouTube Analytics API
   - Create OAuth 2.0 credentials (Desktop app)
3. Run `npm run setup` and follow the prompts

### Environment Variables

Copy `.env.example` to `.env` and set at minimum:
```
GROQ_API_KEY=gsk_your_key_here
DEFAULT_PRIVACY_STATUS=private
```

## Usage

### Full Pipeline
```bash
node run-pipeline.js --topic "Benefits of Play-Based Learning"
```

The pipeline will:
1. Generate a content strategy
2. Write a script
3. Create a thumbnail
4. Optimize SEO metadata
5. Produce a slideshow video
6. **Pause for your approval** before publishing
7. Upload to YouTube as **Private**
8. Capture initial analytics

### Individual Agents
```bash
npm run agent:strategy    # Content strategy only
npm run agent:script      # Script writing only
npm run agent:thumbnail   # Thumbnail design only
npm run agent:seo         # SEO optimization only
npm run agent:production  # Production management only
npm run agent:publishing  # Publishing & scheduling only
npm run agent:analytics   # Analytics only
```

### Skip Publishing
```bash
node run-pipeline.js --skip-publish
```

## Project Structure

```
spacECE-youtube-automation/
├── agents/                    # 7 core pipeline agents
│   ├── content-strategy-agent.js
│   ├── script-writer-agent.js
│   ├── thumbnail-designer-agent.js
│   ├── seo-optimizer-agent.js
│   ├── production-management-agent.js
│   ├── publishing-scheduling-agent.js
│   └── analytics-optimization-agent.js
├── utils/                     # Shared utilities
│   ├── ai-text-service.js     # Groq-only text generation
│   ├── ai-video-generator.js  # Video generation (slideshow path)
│   ├── video-providers.js     # Provider registry (slideshow only)
│   ├── credential-manager.js  # Groq + YouTube credentials
│   ├── channel-learning-engine.js
│   ├── scene-repair-service.js
│   ├── media-generation-service.js
│   ├── youtube-metadata-validator.js
│   ├── ffmpeg.js
│   ├── provenance-service.js
│   ├── scene-retention-engine.js
│   └── logger.js
├── database/
│   └── db.js                  # In-memory database stub
├── config/
│   └── credentials.example.json
├── run-pipeline.js            # Main orchestrator
├── setup.js                   # Setup wizard
├── oauth-server.js            # OAuth callback server
├── modern-auth.js             # Modern auth flow
├── .env.example
├── .gitignore
└── package.json
```

## Phase 2 Notes

> **⚠️ Before moving to the SpacECE channel:**
> - Credential storage must migrate from local JSON files to SpacECE's standard secrets handling
> - Privacy status can be changed from `private` after team lead sign-off
> - Additional AI providers and video generation services may be added

## License

Private — SpacECE internal use.
