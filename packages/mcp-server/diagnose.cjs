#!/usr/bin/env node
/**
 * Diagnostic script to help identify MCP server issues
 */

const path = require('path');
const fs = require('fs');

console.log('=== RAG MCP Server Diagnostic ===\n');

// 1. Check if dist/index.js exists
const indexPath = path.join(__dirname, 'dist/index.js');
console.log('1. Checking build files...');
if (fs.existsSync(indexPath)) {
  console.log('   ✓ dist/index.js exists');
  const stats = fs.statSync(indexPath);
  console.log(`   ✓ Size: ${stats.size} bytes`);
} else {
  console.log('   ✗ dist/index.js NOT FOUND - Run: npm run build');
  process.exit(1);
}

// 2. Check package.json
console.log('\n2. Checking package.json...');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log(`   ✓ Package: ${pkg.name} v${pkg.version}`);
} else {
  console.log('   ✗ package.json NOT FOUND');
}

// 3. Check MCP config
console.log('\n3. Checking MCP configuration...');
const mcpConfigPath = path.join(__dirname, '../../.cursor/mcp.json');
if (fs.existsSync(mcpConfigPath)) {
  console.log('   ✓ .cursor/mcp.json exists');
  const config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
  const ragConfig = config.mcpServers?.rag;
  if (ragConfig) {
    console.log('   ✓ RAG MCP server configured');
    console.log(`   - Command: ${ragConfig.command}`);
    console.log(`   - Args: ${JSON.stringify(ragConfig.args)}`);
    console.log(`   - API URL: ${ragConfig.env?.RAG_API_URL || 'NOT SET'}`);
    console.log(`   - Email: ${ragConfig.env?.RAG_USER_EMAIL || 'NOT SET'}`);
    console.log(`   - Password: ${ragConfig.env?.RAG_USER_PASSWORD ? '[SET]' : 'NOT SET'}`);
    
    // Check if path is absolute
    const serverPath = ragConfig.args?.[0];
    if (serverPath && !path.isAbsolute(serverPath)) {
      console.log('   ⚠ WARNING: Server path should be absolute!');
    }
  } else {
    console.log('   ✗ RAG MCP server NOT configured in mcp.json');
  }
} else {
  console.log('   ✗ .cursor/mcp.json NOT FOUND');
}

// 4. Test API connection
console.log('\n4. Testing API connection...');
const apiUrl = process.env.RAG_API_URL || 'http://localhost:8000';
const email = process.env.RAG_USER_EMAIL || 'john.doe@acme-corp.com';
const password = process.env.RAG_USER_PASSWORD || 'password123';

fetch(`${apiUrl}/health`)
  .then(res => res.json())
  .then(data => {
    console.log(`   ✓ API is accessible at ${apiUrl}`);
    console.log(`   ✓ Health check: ${JSON.stringify(data)}`);
    
    // Test login
    return fetch(`${apiUrl}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
  })
  .then(res => {
    if (res.ok) {
      console.log(`   ✓ Login endpoint works`);
      return res.json();
    } else {
      console.log(`   ✗ Login failed: ${res.status} ${res.statusText}`);
      return res.text().then(text => {
        console.log(`   ✗ Error: ${text}`);
        throw new Error('Login failed');
      });
    }
  })
  .then(loginData => {
    console.log(`   ✓ Authentication successful for ${loginData.user?.email}`);
    console.log('\n=== All checks passed! ===');
    console.log('\nIf you\'re still seeing errors in Cursor:');
    console.log('1. Make sure Cursor is completely restarted');
    console.log('2. Check Cursor\'s MCP logs (View > Output > MCP)');
    console.log('3. Verify the path in .cursor/mcp.json is correct and absolute');
  })
  .catch(error => {
    console.log(`   ✗ API connection failed: ${error.message}`);
    console.log('\n=== Issues found ===');
    console.log('\nTroubleshooting:');
    console.log('1. Make sure the RAG API is running: docker-compose up -d');
    console.log('2. Check API URL: curl http://localhost:8000/health');
    console.log('3. Verify credentials are correct');
    process.exit(1);
  });
