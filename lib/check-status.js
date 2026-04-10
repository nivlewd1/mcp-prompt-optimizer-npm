#!/usr/bin/env node
const CloudApiKeyManager = require('./api-key-manager');
const packageJson = require('../package.json');
async function checkStatus() {
    const developmentMode = process.env.NODE_ENV === 'development' || process.env.OPTIMIZER_DEV_MODE === 'true';
    const modeText = developmentMode ? ' (Development Mode)' : '';
    console.log(`📊 MCP Prompt Optimizer v${packageJson.version} - Status Check${modeText}\n`);
    try {
        const apiKey = process.env.OPTIMIZER_API_KEY;
        if (!apiKey) {
            console.error('❌ No API key found');
            console.log('\n📝 Set your API key to check status:');
            console.log('   export OPTIMIZER_API_KEY=sk-local-your-key-here'); // Aligned with free tier/development
            if (developmentMode) {
                console.log('\n🧪 Development Mode Options:');
                console.log('   export OPTIMIZER_API_KEY=sk-dev-test-key');
            }
            process.exit(1);
        }
        console.log(`🔍 Checking status for API key: ${apiKey.substring(0, 16)}...`);
        const manager = new CloudApiKeyManager(apiKey, { developmentMode });
        console.log('⏳ Fetching account information...\n');
        const apiKeyInfo = await manager.getApiKeyInfo();
        console.log('📊 Account Status:');
        console.log('='.repeat(50));
        console.log(`🎯 Subscription Tier: ${apiKeyInfo.tier}`);
        console.log(`🔑 API Key Type: ${apiKeyInfo.keyType}`);
        console.log(`✅ Key Status: ${apiKeyInfo.isValid ? 'Valid' : 'Invalid'}`);
    } catch (error) {
        console.error(`❌ Status check failed: ${error.message}\n`);
        process.exit(1);
    }
}
if (require.main === module) {
    checkStatus();
}
module.exports = checkStatus;