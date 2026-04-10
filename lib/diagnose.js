#!/usr/bin/env node

/**
 * Diagnostic Command for MCP Prompt Optimizer
 * Enhanced with comprehensive network analysis and development mode support
 */

const CloudApiKeyManager = require('./api-key-manager');
const packageJson = require('../package.json');

async function runDiagnostic() {
    const developmentMode = process.env.NODE_ENV === 'development' || process.env.OPTIMIZER_DEV_MODE === 'true';
    const modeText = developmentMode ? ' (Development Mode)' : '';
    
    console.log(`🔬 MCP Prompt Optimizer v${packageJson.version} - Comprehensive Diagnostic${modeText}\n`);
    
    try {
        const apiKey = process.env.OPTIMIZER_API_KEY;
        
        if (!apiKey) {
            console.log('⚠️  No API key found, running partial diagnostic');
            console.log('Set OPTIMIZER_API_KEY for complete analysis\n');
        }

        const manager = new CloudApiKeyManager(apiKey || 'dummy-key-for-diagnostic', { 
            developmentMode 
        });
        const diagnostic = await manager.getDiagnosticInfo();
        
        console.log('📋 Diagnostic Information:');
        console.log('=' .repeat(60));
        
        // Basic system information
        console.log(`🔑 API Key: ${diagnostic.apiKey}`);
        console.log(`🌐 Backend URL: ${diagnostic.backendUrl}`);
        console.log(`💾 Cache File: ${diagnostic.cacheFile}`);
        console.log(`🏥 Health File: ${diagnostic.healthFile}`);
        console.log(`⏰ Cache Expiry: ${diagnostic.cacheExpiry / 1000 / 60} minutes`);
        console.log(`⏰ Fallback Cache Expiry: ${diagnostic.fallbackCacheExpiry / 1000 / 60 / 60} hours`);
        console.log(`📱 Offline Mode: ${diagnostic.offlineMode}`);
        console.log(`🧪 Development Mode: ${diagnostic.developmentMode}`);
        console.log(`🔄 Max Retries: ${diagnostic.maxRetries}`);
        console.log(`⏱️  Request Timeout: ${diagnostic.requestTimeout}ms`);
        console.log(`🔧 Node Environment: ${diagnostic.nodeEnv || 'not set'}`);
        console.log(`📦 Package Version: ${diagnostic.packageVersion}`);
        
        // Network health section
        console.log('\n🌐 Network Health:');
        const health = diagnostic.networkHealth;
        console.log(`   📊 Consecutive Failures: ${health.consecutiveFailures}`);
        console.log(`   ✅ Last Successful: ${health.lastSuccessful ? new Date(health.lastSuccessful).toLocaleString() : 'Never'}`);
        console.log(`   ⚡ Avg Response Time: ${health.avgResponseTime ? health.avgResponseTime + 'ms' : 'Unknown'}`);
        console.log(`   ❌ Last Error Type: ${health.lastErrorType || 'None'}`);
        
        // Cache status
        console.log('\n📄 Cache Status:');
        if (diagnostic.cache.error) {
            console.log(`   ❌ Error: ${diagnostic.cache.error}`);
        } else {
            console.log(`   📁 Exists: ${diagnostic.cache.exists}`);
            console.log(`   ⏳ Normal Cache Expired: ${diagnostic.cache.expired}`);
            console.log(`   🔄 Fallback Cache Expired: ${diagnostic.cache.fallbackExpired}`);
            console.log(`   📅 Age: ${diagnostic.cache.age} minutes`);
            
            if (diagnostic.cache.backendUrl) {
                console.log(`   🌐 Cached Backend: ${diagnostic.cache.backendUrl}`);
            }
            if (diagnostic.cache.packageVersion) {
                console.log(`   📦 Cached Version: ${diagnostic.cache.packageVersion}`);
            }
        }
        
        // API key format check
        console.log('\n🔍 API Key Format Check:');
        if (diagnostic.keyFormat.valid) {
            console.log(`   ✅ Valid: ${diagnostic.keyFormat.keyType}`);
        } else {
            console.log(`   ❌ Invalid: ${diagnostic.keyFormat.error}`);
        }
        
        // Backend connectivity analysis
        console.log('\n🌐 Backend Connectivity Analysis:');
        const connectivity = diagnostic.backendConnectivity;
        if (connectivity.status === 'success') {
            console.log('   ✅ Connection successful');
            if (connectivity.responseTime) {
                console.log(`   ⚡ Response time: ${connectivity.responseTime}ms`);
            }
        } else {
            console.log(`   ❌ Connection failed: ${connectivity.error}`);
        }
        
    } catch (error) {
        console.error('❌ Diagnostic failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    runDiagnostic();
}

module.exports = runDiagnostic;