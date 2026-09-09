/**
 * Lightweight in-memory database stub for v1.
 *
 * Implements every method the 7 core agents + utility modules call on the
 * `db` object they receive through their constructor.  Data lives only for
 * the duration of the current Node process — no sqlite3 dependency required.
 *
 * A JSON snapshot is optionally persisted to data/db-state.json at the end
 * of a pipeline run via `persist()`.
 */

const fs = require('fs').promises;
const path = require('path');
const { Logger } = require('../utils/logger');

class Database {
  constructor() {
    this.logger = new Logger('Database');

    // In-memory stores
    this._contentStrategies = [];
    this._scripts = [];
    this._thumbnails = [];
    this._seoData = [];
    this._productionData = [];
    this._scheduleEntries = [];
    this._analyticsReports = [];
    this._keywords = [];
    this._publishQueue = [];
    this._contentHistory = [];
    this._productionScenes = [];
    this._sceneRevisions = [];
    this._performanceSnapshots = [];
    this._retentionSnapshots = [];
    this._learningRecommendations = [];
    this._contentProvenance = [];
    this._mediaGenerationTasks = [];
    this._settings = {};
    this._generationJobs = new Map();

    this._nextId = 1;
  }

  async initialize() {
    this.logger.info('In-memory database initialized (v1 stub — no sqlite3 required)');
    return true;
  }

  _id() { return this._nextId++; }

  // ─── Content Strategy ────────────────────────────────────────────────────

  async getContentHistory() { return this._contentHistory; }

  async saveContentStrategy(strategy) {
    const entry = { id: this._id(), ...strategy, created_at: strategy.createdAt || new Date().toISOString() };
    this._contentStrategies.push(entry);
    this._contentHistory.push(entry);
    return entry;
  }

  async getChannelStrategy() { return this._settings.channelStrategy || null; }

  // ─── Scripts ─────────────────────────────────────────────────────────────

  async saveScript(script) {
    const entry = { id: this._id(), ...script };
    this._scripts.push(entry);
    return entry;
  }

  // ─── Thumbnails ──────────────────────────────────────────────────────────

  async saveThumbnail(thumbnailData) {
    const entry = { id: this._id(), ...thumbnailData };
    this._thumbnails.push(entry);
    return entry;
  }

  // ─── SEO ─────────────────────────────────────────────────────────────────

  async getKeywordHistory() { return this._keywords; }

  async saveSEOData(seoData) {
    const entry = { id: this._id(), ...seoData };
    this._seoData.push(entry);
    return entry;
  }

  // ─── Production ──────────────────────────────────────────────────────────

  async getProductionPipeline() { return this._productionData; }

  async saveProductionData(data) {
    this._productionData.push(data);
    return data;
  }

  async updateProductionData(data) {
    const index = this._productionData.findIndex(item => item.id === data.id);
    if (index >= 0) this._productionData[index] = data;
    return data;
  }

  async getProductionBundle(contentId) {
    return this._productionData.find(item => item.id === contentId) || null;
  }

  // ─── Production Scenes ───────────────────────────────────────────────────

  async listProductionScenes(productionId) {
    return this._productionScenes.filter(scene => scene.productionId === productionId);
  }

  async updateProductionScene(sceneId, updates) {
    const scene = this._productionScenes.find(s => s.id === sceneId);
    if (scene) Object.assign(scene, updates);
    return scene || null;
  }

  async replaceProductionScenes(productionId, scenes) {
    this._productionScenes = this._productionScenes.filter(s => s.productionId !== productionId);
    scenes.forEach(scene => this._productionScenes.push({ ...scene, productionId }));
    return scenes;
  }

  async reorderProductionScenes(productionId, orderedIds) {
    const scenes = this._productionScenes.filter(s => s.productionId === productionId);
    const ordered = orderedIds.map(id => scenes.find(s => s.id === id)).filter(Boolean);
    return ordered;
  }

  async saveProductionSceneRevision(revision) {
    const entry = { id: this._id(), ...revision };
    this._sceneRevisions.push(entry);
    return entry;
  }

  // ─── Schedule / Publishing ───────────────────────────────────────────────

  async getPublishQueue() { return this._publishQueue; }

  async saveScheduleEntry(entry) {
    const saved = { id: this._id(), ...entry };
    this._scheduleEntries.push(saved);
    this._publishQueue.push(saved);
    return saved;
  }

  async updateScheduleEntry(entry) {
    const index = this._scheduleEntries.findIndex(item => item.id === entry.id);
    if (index >= 0) this._scheduleEntries[index] = entry;
    const qIndex = this._publishQueue.findIndex(item => item.id === entry.id);
    if (qIndex >= 0) this._publishQueue[qIndex] = entry;
    return entry;
  }

  async getLatestScheduleEntry(productionId) {
    return this._scheduleEntries
      .filter(entry => entry.productionId === productionId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
  }

  async updateShortClip(clipId, updates) {
    // No shorts in v1 — stub
    return null;
  }

  // ─── Analytics ───────────────────────────────────────────────────────────

  async getAnalyticsHistory() { return this._analyticsReports; }

  async saveAnalyticsReport(report) {
    const entry = { id: this._id(), ...report };
    this._analyticsReports.push(entry);
    return entry;
  }

  async getPublishedContentContext(videoId) {
    return this._scheduleEntries.find(entry => entry.youtubeId === videoId) || {};
  }

  // ─── Performance Snapshots ───────────────────────────────────────────────

  async savePerformanceSnapshot(snapshot) {
    const entry = { id: this._id(), ...snapshot };
    this._performanceSnapshots.push(entry);
    return entry;
  }

  async listPerformanceSnapshots(filters = {}) {
    let results = [...this._performanceSnapshots];
    if (filters.videoId) results = results.filter(s => s.videoId === filters.videoId);
    if (filters.limit) results = results.slice(-filters.limit);
    return results;
  }

  // ─── Retention Snapshots ─────────────────────────────────────────────────

  async saveRetentionSnapshot(snapshot) {
    const entry = { id: this._id(), ...snapshot };
    this._retentionSnapshots.push(entry);
    return entry;
  }

  async listRetentionSnapshots(filters = {}) {
    let results = [...this._retentionSnapshots];
    if (filters.videoId) results = results.filter(s => s.videoId === filters.videoId);
    if (filters.limit) results = results.slice(-filters.limit);
    return results;
  }

  // ─── Learning Recommendations ────────────────────────────────────────────

  async saveLearningRecommendation(rec) {
    const entry = { id: this._id(), ...rec };
    this._learningRecommendations.push(entry);
    return entry;
  }

  async listLearningRecommendations(filters = {}) {
    let results = [...this._learningRecommendations];
    if (filters.status) results = results.filter(r => r.status === filters.status);
    if (filters.limit) results = results.slice(0, filters.limit);
    return results;
  }

  // ─── Content Provenance ──────────────────────────────────────────────────

  async saveContentProvenance(provenance) {
    const entry = { id: this._id(), ...provenance };
    this._contentProvenance.push(entry);
    return entry;
  }

  async getContentProvenance(productionId) {
    return this._contentProvenance.find(p => p.productionId === productionId) || null;
  }

  // ─── Media Generation Tasks ──────────────────────────────────────────────

  async createMediaGenerationTask(task) {
    const entry = { id: this._id(), ...task, createdAt: new Date().toISOString() };
    this._mediaGenerationTasks.push(entry);
    return entry;
  }

  async findMediaGenerationTask(filters = {}) {
    return this._mediaGenerationTasks.find(t =>
      (!filters.externalTaskId || t.externalTaskId === filters.externalTaskId) &&
      (!filters.status || t.status === filters.status)
    ) || null;
  }

  async updateMediaGenerationTask(id, updates) {
    const task = this._mediaGenerationTasks.find(t => t.id === id || t.externalTaskId === id);
    if (task) Object.assign(task, updates);
    return task || null;
  }

  // ─── Generation Jobs ────────────────────────────────────────────────────

  async getGenerationJob(jobId) {
    return this._generationJobs.get(jobId) || null;
  }

  // ─── Readiness ───────────────────────────────────────────────────────────

  async getLatestReadinessRun() { return null; }

  // ─── Settings ────────────────────────────────────────────────────────────

  async getAllSettings() { return this._settings; }

  // ─── Generic Query ───────────────────────────────────────────────────────

  async getAllRows(query) {
    // Very simplified SQL-like query support for content_strategies table
    if (query && query.includes('content_strategies')) {
      return this._contentStrategies.map(s => ({ topic: s.topic, created_at: s.created_at || s.createdAt }));
    }
    return [];
  }

  // ─── Persistence (optional) ──────────────────────────────────────────────

  async persist() {
    const statePath = path.join(__dirname, '..', 'data', 'db-state.json');
    try {
      await fs.mkdir(path.dirname(statePath), { recursive: true });
      const state = {
        contentStrategies: this._contentStrategies,
        scripts: this._scripts,
        thumbnails: this._thumbnails,
        seoData: this._seoData,
        productionData: this._productionData,
        scheduleEntries: this._scheduleEntries,
        analyticsReports: this._analyticsReports,
        persistedAt: new Date().toISOString()
      };
      await fs.writeFile(statePath, JSON.stringify(state, null, 2));
      this.logger.info(`Database state persisted to ${statePath}`);
    } catch (error) {
      this.logger.warn(`Failed to persist database state: ${error.message}`);
    }
  }
}

module.exports = { Database };
