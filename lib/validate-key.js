#!/usr/bin/env node
const CloudApiKeyManager = require('./api-key-manager');
const packageJson = require('../package.json');
async function validateKey() {
    const developmentMode = process.env.NODE_ENV === 'development' || process.env.OPTIMIZER_DEV_MODE === 'true';
    const modeText = developmentMode ? ' (Development Mode)' : '';
    console.log(`🔑 MCP Prompt Optimizer v${packageJson.version} - API Key Validation${modeText}\n`);
    try {
        const apiKey = CloudApiKeyManager.getApiKey();
        console.log(`🔑 Testing API key: ${apiKey.substring(0, 16)}...`);
        const manager = new CloudApiKeyManager(apiKey, { developmentMode });
        const validation = await manager.validateAndPrepare();
        console.log('✅ API Key Validation: SUCCESS\n');
        console.log('📊 Key Details:');
        console.log(`   Tier: ${validation.tier}`);
    } catch (error) {
        console.error(`❌ Validation Failed: ${error.message}\n`);
        process.exit(1);
    }
}
if (require.main === module) {
    validateKey();
}
module.exports = validateKey;