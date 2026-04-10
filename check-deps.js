#!/usr/bin/env node

/**
 * 🔍 DEPENDENCY CHECK
 * 
 * Quick check of dependencies and module loading
 */

console.log('🔍 Dependency Check\n');

// Check MCP SDK
try {
    console.log('Testing @modelcontextprotocol/sdk...');
    const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
    const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
    const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
    
    console.log('✅ MCP SDK loaded successfully');
    console.log(`   Server: ${typeof Server}`);
    console.log(`   Transport: ${typeof StdioServerTransport}`);
    console.log(`   Schemas: ${typeof CallToolRequestSchema}`);
} catch (error) {
    console.log('❌ MCP SDK loading failed:');
    console.log(`   ${error.message}`);
}

// Check node-fetch
try {
    console.log('\nTesting node-fetch...');
    const fetch = require('node-fetch');
    console.log('✅ node-fetch loaded successfully');
    console.log(`   Type: ${typeof fetch}`);
} catch (error) {
    console.log('❌ node-fetch loading failed:');
    console.log(`   ${error.message}`);
}

// Check if we can create our main class
try {
    console.log('\nTesting main class creation...');
    const { MCPPromptOptimizer } = require('../index.js');
    console.log('✅ Main module loaded successfully');
    console.log(`   Class: ${typeof MCPPromptOptimizer}`);
    
    // Try to create an instance
    const instance = new MCPPromptOptimizer();
    console.log('✅ Instance created successfully');
    console.log(`   Backend URL: ${instance.backendUrl}`);
    console.log(`   Dev Mode: ${instance.developmentMode}`);
    
} catch (error) {
    console.log('❌ Main class creation failed:');
    console.log(`   ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
}

console.log('\n🎯 Dependency check complete');
