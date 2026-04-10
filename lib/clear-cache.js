#!/usr/bin/env node
const CloudApiKeyManager = require('./api-key-manager');
const packageJson = require('../package.json');
async function clearCache() {
    const developmentMode = process.env.NODE_ENV === 'development' || process.env.OPTIMIZER_DEV_MODE === 'true';
    const modeText = developmentMode ? ' (Development Mode)' : '';
    console.log(`🧹 MCP Prompt Optimizer v${packageJson.version} - Clear Cache${modeText}\n`);
    try {
        const apiKey = process.env.OPTIMIZER_API_KEY;
        const manager = new CloudApiKeyManager(apiKey || 'dummy-key', { developmentMode });
        await manager.clearCache();
        console.log('✅ Cache clearing completed successfully!\n');
    } catch (error) {
        console.error(`❌ Cache clearing failed: ${error.message}\n`);
        process.exit(1);
    }
}
if (require.main === module) {
    clearCache();
}
module.exports = clearCache;