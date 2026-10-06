const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { Logger } = require('./logger');

class StockFootageService {
  constructor(credentials = {}) {
    this.logger = new Logger('StockFootageService');
    this.pexelsKey = credentials.pexels?.apiKey || process.env.PEXELS_API_KEY;
    this.pixabayKey = credentials.pixabay?.apiKey || process.env.PIXABAY_API_KEY;
  }

  isAvailable() {
    return Boolean(this.pexelsKey || this.pixabayKey);
  }

  toSearchQuery(prompt) {
    return String(prompt || '')
      .replace(/ethereal|mystical|dreamscape|storytelling|creative|visualization|background/gi, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .join(' ')
      .trim();
  }

  async searchPexels(query) {
    if (!this.pexelsKey) return null;
    try {
      const response = await axios.get('https://api.pexels.com/videos/search', {
        headers: { Authorization: this.pexelsKey },
        params: { query, per_page: 5, orientation: 'landscape' },
        timeout: 15000
      });
      const videos = response.data?.videos || [];
      for (const video of videos) {
        const file = (video.video_files || [])
          .filter(f => f.width && f.width >= 1280)
          .sort((a, b) => a.width - b.width)[0];
        if (file) return { url: file.link, duration: video.duration, source: 'pexels', sourceUrl: video.url };
      }
      return null;
    } catch (error) {
      this.logger.warn(`Pexels search failed for "${query}": ${error.message}`);
      return null;
    }
  }

  async searchPixabay(query) {
    if (!this.pixabayKey) return null;
    try {
      const response = await axios.get('https://pixabay.com/api/videos/', {
        params: { key: this.pixabayKey, q: query, per_page: 5, safesearch: true },
        timeout: 15000
      });
      const hits = response.data?.hits || [];
      for (const hit of hits) {
        const file = hit.videos?.medium || hit.videos?.small;
        if (file?.url) return { url: file.url, duration: hit.duration, source: 'pixabay', sourceUrl: hit.pageURL };
      }
      return null;
    } catch (error) {
      this.logger.warn(`Pixabay search failed for "${query}": ${error.message}`);
      return null;
    }
  }

  async findClip(prompt) {
    const query = this.toSearchQuery(prompt);
    if (!query) return null;
    return (await this.searchPexels(query)) || (await this.searchPixabay(query));
  }

  async downloadClip(clip, outputPath) {
    const response = await axios.get(clip.url, { responseType: 'arraybuffer', timeout: 60000 });
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, Buffer.from(response.data));
    return outputPath;
  }

  // Returns { path, source, sourceUrl, duration } or null if nothing found —
  // caller is responsible for falling back to slideshow when null.
  async getSceneClip(prompt, outputDir, index) {
    const clip = await this.findClip(prompt);
    if (!clip) return null;
    const outputPath = path.join(outputDir, `stock_scene_${index}.mp4`);
    await this.downloadClip(clip, outputPath);
    return { path: outputPath, source: clip.source, sourceUrl: clip.sourceUrl, duration: clip.duration };
  }
}

module.exports = { StockFootageService };
