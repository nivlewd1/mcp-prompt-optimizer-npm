/**
 * Cloud API Key Manager for MCP Prompt Optimizer
 * Production-grade with enhanced network resilience and development mode
 * ALIGNED with backend API requirements - FIXED API ENDPOINTS
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const os = require('os');

const packageJson = require('../package.json');

class CloudApiKeyManager {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.backendUrl = options.backendUrl || process.env.OPTIMIZER_BACKEND_URL || 'https://p01--project-optimizer--fvmrdk8m9k9j.code.run';
        this.cacheFile = path.join(os.homedir(), '.mcp-cloud-api-cache.json');
        this.healthFile = path.join(os.homedir(), '.mcp-cloud-health.json');
        this.cacheExpiry = options.cacheExpiry || 1 * 60 * 60 * 1000; // 1 hour (reduced from 24)
        this.fallbackCacheExpiry = options.fallbackCacheExpiry || 2 * 60 * 60 * 1000; // 2 hours (reduced from 7 days)
        this.logPrefix = '[CloudApiKeyManager]';
        // SECURITY: Offline mode disabled in production for security
        this.offlineMode = false;
        // SECURITY: Development mode disabled - use separate dev builds
        this.developmentMode = false;
        this.maxRetries = options.maxRetries || 5; // Increased for production
        this.baseRetryDelay = options.baseRetryDelay || 1000;
        this.maxRetryDelay = options.maxRetryDelay || 30000;
        this.requestTimeout = options.requestTimeout || 15000;
        
        // Network health tracking
        this.networkHealth = {
            consecutiveFailures: 0,
            lastSuccessful: null,
            avgResponseTime: null,
            lastErrorType: null
        };
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = `${timestamp} ${this.logPrefix}`;
        
        if (level === 'error') {
            console.error(`${prefix} ❌ ${message}`);
        } else if (level === 'warn') {
            console.warn(`${prefix} ⚠️  ${message}`);
        } else if (level === 'success') {
            console.log(`${prefix} ✅ ${message}`);
        } else {
            console.log(`${prefix} ℹ️  ${message}`);
        }
    }

    // Production-grade exponential backoff with jitter
    calculateRetryDelay(attempt) {
        const exponentialDelay = Math.min(
            this.baseRetryDelay * Math.pow(2, attempt - 1),
            this.maxRetryDelay
        );
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.3 * exponentialDelay;
        return Math.floor(exponentialDelay + jitter);
    }

    // Enhanced API key format validation
    validateApiKeyFormat(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return { valid: false, error: 'API key must be a string' };
        }

        // Support development keys
        const validPrefixes = ['sk-opt-', 'sk-team-', 'sk-local-', 'sk-dev-'];
        const hasValidPrefix = validPrefixes.some(prefix => apiKey.startsWith(prefix));
        
        if (!hasValidPrefix) {
            return { 
                valid: false, 
                error: 'Invalid API key format. Must start with "sk-opt-" (individual), "sk-team-" (team), "sk-local-" (development), or "sk-dev-" (testing)' 
            };
        }

        // Check minimum length for security
        if (apiKey.length < 20) {
            return { 
                valid: false, 
                error: 'API key too short' 
            };
        }

        // Determine type
        let keyType = 'unknown';
        if (apiKey.startsWith('sk-opt-')) {
            keyType = 'individual';
        } else if (apiKey.startsWith('sk-team-')) {
            keyType = 'team';
        } else if (apiKey.startsWith('sk-local-')) {
            keyType = 'development';
        } else if (apiKey.startsWith('sk-dev-')) {
            keyType = 'testing';
        }

        return { 
            valid: true, 
            keyType: keyType
        };
    }

    // Development mode mock responses
    generateMockValidation(keyType) {
        const mockResponses = {
            individual: {
                valid: true,
                tier: 'explorer',
                api_key_type: 'individual',
                quota: {
                    limit: 5000,
                    used: Math.floor(Math.random() * 1000),
                    unlimited: false
                },
                features: {
                    ai_context_detection: true,
                    template_management: true,
                    optimization_insights: true
                }
            },
            team: {
                valid: true,
                tier: 'creator',
                api_key_type: 'team',
                quota: {
                    limit: 18000,
                    used: Math.floor(Math.random() * 3000),
                    unlimited: false
                },
                features: {
                    ai_context_detection: true,
                    template_management: true,
                    team_collaboration: true,
                    optimization_insights: true
                }
            },
            development: {
                valid: true,
                tier: 'development',
                api_key_type: 'development',
                quota: {
                    unlimited: true
                },
                features: {
                    ai_context_detection: true,
                    template_management: true,
                    optimization_insights: true,
                    development_mode: true
                }
            },
            testing: {
                valid: true,
                tier: 'testing',
                api_key_type: 'testing',
                quota: {
                    limit: 1000,
                    used: Math.floor(Math.random() * 100),
                    unlimited: false
                },
                features: {
                    ai_context_detection: true,
                    template_management: true,
                    optimization_insights: true,
                    testing_mode: true
                }
            }
        };

        const response = mockResponses[keyType] || mockResponses.development;
        response.mock_mode = true;
        response.backend_url = 'mock://development-mode';
        
        return response;
    }

    // Enhanced API key validation with production resilience
    async validateApiKey() {
        this.log('Starting comprehensive API key validation...');

        if (!this.apiKey) {
            throw new Error('API key is required. Set OPTIMIZER_API_KEY environment variable or provide key directly.');
        }

        // Step 1: Format validation
        const formatCheck = this.validateApiKeyFormat(this.apiKey);
        if (!formatCheck.valid) {
            throw new Error(formatCheck.error);
        }

        this.log(`API key format valid: ${formatCheck.keyType}`);

        // SECURITY: Mock validation removed - all keys must validate against backend
        // Development/testing keys must be real keys in the database

        try {
            // Step 3: Backend validation with enhanced retry logic
            const validation = await this.validateWithBackendRetry();
            
            // Step 4: Validate response structure
            if (validation && validation.valid) {
                await this.cacheValidation(validation);
                await this.updateNetworkHealth(true);
                this.log(`API key validated successfully: ${validation.tier}`, 'success');
                return validation;
            } else {
                throw new Error(validation?.detail || validation?.error || 'API key validation failed');
            }

        } catch (error) {
            this.log(`Backend validation failed: ${error.message}`, 'warn');
            await this.updateNetworkHealth(false, error.message);
            
            // Enhanced fallback strategy
            const cachedValidation = await this.getCachedValidation();
            
            if (cachedValidation && !this.isCacheExpired(cachedValidation)) {
                this.log('Using cached API key validation', 'warn');
                return cachedValidation.data;
            }
            
            // SECURITY: Limited fallback for brief network issues only (2 hours max)
            if (cachedValidation && !this.isFallbackCacheExpired(cachedValidation)) {
                this.log('Using short-term fallback cache due to network issues', 'warn');
                const fallbackData = cachedValidation.data;
                fallbackData.fallback_mode = true;
                fallbackData.network_issue = error.message;
                fallbackData.expires_soon = true;
                return fallbackData;
            }

            // SECURITY: Offline mode removed - backend validation required
            // No cache fallback beyond 2 hours

            throw new Error(`API key validation failed: ${error.message}. Please check your internet connection.`);
        }
    }

    // Production-grade retry logic with exponential backoff
    async validateWithBackendRetry() {
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                this.log(`Validation attempt ${attempt}/${this.maxRetries}...`);
                const startTime = Date.now();
                
                const result = await this.validateWithBackend();
                
                // Track response time for health monitoring
                const responseTime = Date.now() - startTime;
                if (this.networkHealth.avgResponseTime === null) {
                    this.networkHealth.avgResponseTime = responseTime;
                } else {
                    this.networkHealth.avgResponseTime = (this.networkHealth.avgResponseTime + responseTime) / 2;
                }
                
                return result;
            } catch (error) {
                lastError = error;
                this.log(`Attempt ${attempt} failed: ${error.message}`, 'warn');
                
                if (attempt < this.maxRetries) {
                    const delay = this.calculateRetryDelay(attempt);
                    this.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    this.log('All retry attempts exhausted', 'error');
                }
            }
        }
        
        throw lastError;
    }

    // ✅ FIXED: Correct API endpoint URL
    async validateWithBackend() {
        const endpoint = '/api/v1/api-keys/validate';
        const method = 'POST';
        
        try {
            const validation = await this._makeBackendRequest(endpoint, null, method);
            this.log(`Validation successful: ${JSON.stringify(validation, null, 2)}`);
            return validation;
        } catch (error) {
            this.log(`Backend validation request failed: ${error.message}`, 'error');
            throw error;
        }
    }

    // ✅ FIXED: Correct API endpoint URL
    async getQuotaStatus() {
        try {
            // FIXED: Use MCP quota-status endpoint (accepts API key auth)
            const url = `${this.backendUrl}/api/v1/mcp/quota-status`;

            const options = {
                method: 'GET',
                headers: {
                    'x-api-key': this.apiKey,
                    'User-Agent': `mcp-prompt-optimizer/${packageJson.version}`,
                    'Connection': 'close'
                },
                timeout: this.requestTimeout
            };

            return new Promise((resolve, reject) => {
                const client = this.backendUrl.startsWith('https://') ? https : http;
                const req = client.request(url, options, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        try {
                            if (res.statusCode === 200) {
                                const response = JSON.parse(data);
                                // FIXED: Map nested MCP response to flat format
                                resolve({
                                    tier: response.tier,
                                    unlimited: response.quota?.unlimited || false,
                                    used: response.quota?.used || 0,
                                    remaining: response.quota?.remaining || 0,
                                    limit: response.quota?.limit,
                                    usage_percentage: response.quota?.percentage || 0,
                                    status: response.quota?.status || 'unknown',
                                    features_available: response.features_available || {}
                                });
                            } else {
                                let errorMessage;
                                try {
                                    const error = JSON.parse(data);
                                    errorMessage = error.detail || `HTTP ${res.statusCode}`;
                                } catch {
                                    errorMessage = `HTTP ${res.statusCode}: ${data}`;
                                }
                                reject(new Error(errorMessage));
                            }
                        } catch (parseError) {
                            reject(new Error(`Invalid response: ${parseError.message}`));
                        }
                    });
                });

                req.on('error', (error) => {
                    reject(new Error(`Network error: ${error.message}`));
                });

                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Request timeout'));
                });

                req.setTimeout(this.requestTimeout);
                req.end();
            });

        } catch (error) {
            this.log(`Quota status check failed: ${error.message}`, 'warn');
            throw error;
        }
    }

    // Network health tracking
    async updateNetworkHealth(success, errorMessage = null) {
        try {
            if (success) {
                this.networkHealth.consecutiveFailures = 0;
                this.networkHealth.lastSuccessful = Date.now();
                this.networkHealth.lastErrorType = null;
            } else {
                this.networkHealth.consecutiveFailures++;
                this.networkHealth.lastErrorType = errorMessage;
            }

            // Save health metrics
            await fs.writeFile(this.healthFile, JSON.stringify(this.networkHealth, null, 2));
        } catch (error) {
            this.log(`Failed to update network health: ${error.message}`, 'warn');
        }
    }



    // Enhanced caching with metadata
    async cacheValidation(validation) {
        try {
            const cacheData = {
                timestamp: Date.now(),
                apiKeyPrefix: this.apiKey.substring(0, 20) + '...', // Safe prefix only
                data: validation,
                backendUrl: this.backendUrl,
                packageVersion: packageJson.version,
                networkHealth: { ...this.networkHealth }
            };
            
            await fs.writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2));
            this.log('API key validation cached successfully');
        } catch (error) {
            this.log(`Failed to cache validation: ${error.message}`, 'warn');
        }
    }

    async getCachedValidation() {
        try {
            const cacheContent = await fs.readFile(this.cacheFile, 'utf8');
            const cached = JSON.parse(cacheContent);
            
            // Validate cache structure
            if (!cached.timestamp || !cached.data) {
                this.log('Invalid cache structure, ignoring', 'warn');
                return null;
            }
            
            return cached;
        } catch (error) {
            if (error.code !== 'ENOENT') {
                this.log(`Cache read error: ${error.message}`, 'warn');
            }
            return null;
        }
    }

    isCacheExpired(cachedData) {
        if (!cachedData || !cachedData.timestamp) {
            return true;
        }
        
        const age = Date.now() - cachedData.timestamp;
        const expired = age > this.cacheExpiry;
        
        if (expired) {
            this.log(`Cache expired: ${Math.round(age / 1000 / 60)} minutes old`);
        }
        
        return expired;
    }

    // Extended fallback cache for network issues
    isFallbackCacheExpired(cachedData) {
        if (!cachedData || !cachedData.timestamp) {
            return true;
        }
        
        const age = Date.now() - cachedData.timestamp;
        const expired = age > this.fallbackCacheExpiry;
        
        if (expired) {
            this.log(`Fallback cache expired: ${Math.round(age / 1000 / 60 / 60)} hours old`);
        }
        
        return expired;
    }

    async clearCache() {
        try {
            await fs.unlink(this.cacheFile);
            this.log('API key cache cleared successfully');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                this.log(`Cache clear error: ${error.message}`, 'warn');
            }
        }

        try {
            await fs.unlink(this.healthFile);
            this.log('Network health cache cleared successfully');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                this.log(`Health cache clear error: ${error.message}`, 'warn');
            }
        }
    }

    // Enhanced validation and preparation
    async validateAndPrepare() {
        this.log('Starting comprehensive API key validation and preparation...');

        try {
            // Step 1: Validate API key
            let validation = await this.validateApiKey();
            
            // Step 2: Get comprehensive quota status
            const info = await this.getApiKeyInfo();
            let quotaStatus = info.quota;
            validation = info; // Use info as the main validation object for consistency
            
            // Step 3: Log success
            const mode = validation.mock_mode ? '(mock)' : 
                        validation.fallback_mode ? '(fallback)' : 
                        validation.offline_mode ? '(offline)' : '';
            
            if (quotaStatus.unlimited) {
                this.log(`API key valid: ${validation.tier} ${mode} (unlimited usage)`, 'success');
            } else {
                this.log(`API key valid: ${validation.tier} ${mode} (${quotaStatus.remaining}/${quotaStatus.limit} remaining this month)`, 'success');
            }

            return {
                validation,
                quotaStatus,
                tier: validation.tier,
                features: validation.features || {},
                mode: {
                    development: this.developmentMode,
                    mock: validation.mock_mode || false,
                    fallback: validation.fallback_mode || false,
                    offline: validation.offline_mode || false
                }
            };

        } catch (error) {
            this.log(`API key validation failed: ${error.message}`, 'error');
            throw error;
        }
    }

    // Enhanced API key info with backend validation
    async getApiKeyInfo() {
        const formatCheck = this.validateApiKeyFormat(this.apiKey);

        // SECURITY: Mock data removed - all keys must validate with backend

        try {
            // FIXED: Use MCP quota-status endpoint (accepts API key auth)
            const quotaStatusResponse = await this._makeBackendRequest('/api/v1/mcp/quota-status', null, 'GET');
            
            // The backend /mcp/quota-status endpoint returns a comprehensive object
            // that includes tier, quota details, and features.
            return {
                tier: quotaStatusResponse.tier,
                features: quotaStatusResponse.features_available || {},
                quota: quotaStatusResponse.quota,
                isValid: true,
                keyType: quotaStatusResponse.account_type || this.validateApiKeyFormat(this.apiKey).keyType,
                mode: {
                    mock: false, // This endpoint doesn't return mock status
                    fallback: false,
                    offline: false,
                    development: this.developmentMode
                }
            };
        } catch (error) {
            this.log(`Error getting API key info: ${error.message}`, 'error');
            return {
                tier: null,
                features: {},
                quota: { allowed: false },
                isValid: false,
                error: error.message,
                keyType: 'unknown',
                mode: {
                    mock: false,
                    fallback: false,
                    offline: false,
                    development: this.developmentMode
                }
            };
        }
    }

    // Static method to get API key from environment
    static getApiKey() {
        const envKey = process.env.OPTIMIZER_API_KEY;
        if (envKey) {
            return envKey;
        }

        throw new Error(
            'API key required. Set the OPTIMIZER_API_KEY environment variable.\n' +
            'Get your API key at: https://promptoptimizer-blog.vercel.app/pricing'
        );
    }

    // Static method to create manager with environment key
    static fromEnvironment(options = {}) {
        const apiKey = CloudApiKeyManager.getApiKey();
        return new CloudApiKeyManager(apiKey, options);
    }

    // Format key for display (hide sensitive parts)
    formatKeyForDisplay() {
        if (!this.apiKey) return 'No key';
        return `${this.apiKey.substring(0, 8)}...${this.apiKey.slice(-4)}`;
    }

    async getDiagnosticInfo() {
        const diagnosticInfo = {
            apiKey: this.apiKey ? this.formatKeyForDisplay() : 'Not set',
            backendUrl: this.backendUrl,
            cacheFile: this.cacheFile,
            healthFile: this.healthFile,
            cacheExpiry: this.cacheExpiry,
            fallbackCacheExpiry: this.fallbackCacheExpiry,
            offlineMode: this.offlineMode,
            developmentMode: this.developmentMode,
            maxRetries: this.maxRetries,
            requestTimeout: this.requestTimeout,
            nodeEnv: process.env.NODE_ENV || 'not set',
            packageVersion: packageJson.version,
            networkHealth: { ...this.networkHealth },
            cache: {},
            keyFormat: this.validateApiKeyFormat(this.apiKey),
            backendConnectivity: { status: 'unknown', error: null, responseTime: null }
        };

        // Get cache status
        try {
            const cached = await this.getCachedValidation();
            if (cached) {
                diagnosticInfo.cache.exists = true;
                diagnosticInfo.cache.expired = this.isCacheExpired(cached);
                diagnosticInfo.cache.fallbackExpired = this.isFallbackCacheExpired(cached);
                diagnosticInfo.cache.age = Math.round((Date.now() - cached.timestamp) / 1000 / 60);
                diagnosticInfo.cache.backendUrl = cached.backendUrl;
                diagnosticInfo.cache.packageVersion = cached.packageVersion;
            } else {
                diagnosticInfo.cache.exists = false;
            }
        } catch (error) {
            diagnosticInfo.cache.error = error.message;
            diagnosticInfo.cache.exists = false;
        }

        // Check backend connectivity
        if (this.apiKey) { // Only check if API key is present
            try {
                const startTime = Date.now();
                await this.validateWithBackend(); // This will attempt to connect to the backend
                const responseTime = Date.now() - startTime;
                diagnosticInfo.backendConnectivity.status = 'success';
                diagnosticInfo.backendConnectivity.responseTime = responseTime;
            } catch (error) {
                diagnosticInfo.backendConnectivity.status = 'failed';
                diagnosticInfo.backendConnectivity.error = error.message;
            }
        } else {
            diagnosticInfo.backendConnectivity.status = 'skipped';
            diagnosticInfo.backendConnectivity.error = 'No API key provided for connectivity check.';
        }

        return diagnosticInfo;
    }

    async _makeBackendRequest(endpoint, data, method = 'POST') {
        return new Promise((resolve, reject) => {
            const url = `${this.backendUrl}${endpoint}`;
            
            const options = {
                method: method,
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                    'User-Agent': `mcp-prompt-optimizer/${packageJson.version}`,
                    'Accept': 'application/json',
                    'Connection': 'close'
                },
                timeout: this.requestTimeout
            };

            const client = this.backendUrl.startsWith('https://') ? https : http;
            const req = client.request(url, options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            const parsed = JSON.parse(responseData);
                            resolve(parsed);
                        } else {
                            let errorMessage;
                            try {
                                const error = JSON.parse(responseData);
                                errorMessage = error.detail || error.message || `HTTP ${res.statusCode}`;
                            } catch {
                                errorMessage = `HTTP ${res.statusCode}: ${responseData}`;
                            }
                            reject(new Error(errorMessage));
                        }
                    } catch (parseError) {
                        reject(new Error(`Invalid response format: ${parseError.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                if (error.code === 'ENOTFOUND') {
                    reject(new Error(`DNS resolution failed: Cannot resolve ${this.backendUrl.replace(/^https?:\/\//, '')}`));
                } else if (error.code === 'ECONNREFUSED') {
                    reject(new Error(`Connection refused: Backend server may be down`));
                } else if (error.code === 'ETIMEDOUT') {
                    reject(new Error(`Connection timeout: Backend server is not responding`));
                } else if (error.code === 'ECONNRESET') {
                    reject(new Error(`Connection reset: Network instability detected`));
                } else {
                    reject(new Error(`Network error: ${error.message}`));
                }
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout - backend may be unavailable'));
            });

            req.setTimeout(this.requestTimeout);
            
            if (method !== 'GET' && data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }
}

module.exports = CloudApiKeyManager;
