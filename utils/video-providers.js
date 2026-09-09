const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// v1: slideshow-only — paid providers are kept as stubs (always unavailable)
// so the rest of the codebase that references them doesn't break.
const DEFAULT_PROVIDER_ORDER = ['slideshow'];

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value)));

function normalizeCredentials(input = {}) {
  return input.credentials || input;
}

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function safeModelError(error) {
  return String(error?.response?.data?.message || error?.response?.data?.error?.message || error?.message || error || 'Video provider request failed')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .replace(/(api[_-]?key|token|secret)=([^\s&]+)/gi, '$1=[redacted]')
    .slice(0, 500);
}

async function fileToDataUrl(filePath) {
  if (!filePath) return null;
  if (/^https?:\/\//i.test(filePath) || /^data:/i.test(filePath)) return filePath;
  const extension = path.extname(filePath).toLowerCase();
  const mime = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.mp3': 'audio/mpeg', '.wav': 'audio/wav'
  }[extension] || 'application/octet-stream';
  return `data:${mime};base64,${(await fs.readFile(filePath)).toString('base64')}`;
}

class VideoProvider {
  constructor(id, options = {}) {
    this.id = id;
    this.model = options.model;
    this.capabilities = options.capabilities || {};
  }

  isAvailable() { return false; }

  supports(request = {}) {
    const duration = Number(request.duration || 0);
    if (duration && this.capabilities.minDuration && duration < this.capabilities.minDuration) return false;
    if (duration && Number.isFinite(this.capabilities.maxDuration) && duration > this.capabilities.maxDuration) return false;
    if (request.firstFrame && !this.capabilities.firstFrame) return false;
    if (request.lastFrame && !this.capabilities.lastFrame) return false;
    if (request.generateAudio && !this.capabilities.nativeAudio) return false;
    if ((request.referenceImages || []).length > Number(this.capabilities.referenceImages || 0)) return false;
    if ((request.referenceVideos || []).length > Number(this.capabilities.referenceVideos || 0)) return false;
    if ((request.referenceAudios || []).length > Number(this.capabilities.referenceAudios || 0)) return false;
    return true;
  }

  describe() {
    return {
      id: this.id,
      model: this.model,
      available: this.isAvailable(),
      capabilities: this.capabilities
    };
  }

  normalizeRequest(request = {}) {
    const minimum = this.capabilities.minDuration || 4;
    const maximum = this.capabilities.maxDuration || 10;
    return {
      ...request,
      prompt: String(request.prompt || '').slice(0, this.capabilities.maxPromptLength || 2000),
      duration: clamp(request.duration || minimum, minimum, maximum),
      aspectRatio: request.aspectRatio || '16:9',
      resolution: request.resolution || this.capabilities.defaultResolution || '720p',
      generateAudio: request.generateAudio === true,
      referenceImages: request.referenceImages || [],
      referenceVideos: request.referenceVideos || [],
      referenceAudios: request.referenceAudios || []
    };
  }

  async downloadResult(task, outputPath) {
    if (!task.outputUrl) throw new Error(`${this.id} completed without a downloadable video`);
    const response = await axios.get(task.outputUrl, { responseType: 'arraybuffer', timeout: 120000 });
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, Buffer.from(response.data));
    return outputPath;
  }

  async cancelTask() { return false; }
}

// ─── Paid Provider Stubs (always unavailable in v1) ─────────────────────────
// These exist so the registry can be constructed without crashing, but they
// never report as available since no API keys are configured.

class SeedanceProvider extends VideoProvider {
  constructor() {
    super('seedance', { model: 'disabled-in-v1', capabilities: {} });
  }
  isAvailable() { return false; }
}

class MiniMaxH3Provider extends VideoProvider {
  constructor() {
    super('minimax_h3', { model: 'disabled-in-v1', capabilities: {} });
  }
  isAvailable() { return false; }
}

class GoogleOmniProvider extends VideoProvider {
  constructor() {
    super('google_omni', { model: 'disabled-in-v1', capabilities: {} });
  }
  isAvailable() { return false; }
}

class KlingProvider extends VideoProvider {
  constructor() {
    super('kling', { model: 'disabled-in-v1', capabilities: {} });
  }
  isAvailable() { return false; }
}

class WanProvider extends VideoProvider {
  constructor() {
    super('wan', { model: 'disabled-in-v1', capabilities: {} });
  }
  isAvailable() { return false; }
}

// ─── Slideshow Provider (the only active path in v1) ─────────────────────────

class SlideshowProvider extends VideoProvider {
  constructor() {
    super('slideshow', { model: 'local-ffmpeg', capabilities: { local: true, text: true, maxDuration: Infinity } });
  }
  isAvailable() { return true; }
}

// ─── Registry ────────────────────────────────────────────────────────────────

class VideoProviderRegistry {
  constructor(credentials = {}, options = {}) {
    const injected = options.providers || {};
    this.providers = new Map([
      ['seedance', injected.seedance || new SeedanceProvider()],
      ['minimax_h3', injected.minimax_h3 || new MiniMaxH3Provider()],
      ['google_omni', injected.google_omni || new GoogleOmniProvider()],
      ['kling', injected.kling || new KlingProvider()],
      ['wan', injected.wan || new WanProvider()],
      ['slideshow', injected.slideshow || new SlideshowProvider()]
    ]);
  }

  get(id) { return this.providers.get(id); }
  list() { return Array.from(this.providers.values()).map(provider => provider.describe()); }

  select(requested = 'slideshow', order = DEFAULT_PROVIDER_ORDER, request = {}) {
    if (requested && requested !== 'auto') {
      const provider = this.get(requested);
      return provider?.isAvailable() ? provider : this.get('slideshow');
    }
    for (const id of order) {
      const provider = this.get(id);
      if (provider?.isAvailable() && provider.supports(request)) return provider;
    }
    return this.get('slideshow');
  }
}

module.exports = {
  DEFAULT_PROVIDER_ORDER,
  VideoProvider,
  VideoProviderRegistry,
  SeedanceProvider,
  MiniMaxH3Provider,
  GoogleOmniProvider,
  KlingProvider,
  WanProvider,
  SlideshowProvider,
  safeModelError
};
