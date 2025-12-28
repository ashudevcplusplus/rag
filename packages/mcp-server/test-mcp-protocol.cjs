#!/usr/bin/env node
/**
 * Test MCP protocol interaction
 * This simulates what Cursor does when connecting to the MCP server
 */

const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'dist/index.js');
const env = {
  ...process.env,
  RAG_API_URL: process.env.RAG_API_URL || 'http://localhost:8000',
  RAG_USER_EMAIL: process.env.RAG_USER_EMAIL || 'john.doe@acme-corp.com',
  RAG_USER_PASSWORD: process.env.RAG_USER_PASSWORD || 'password123',
};

console.log('Starting MCP server...\n');
console.log(`Server: ${serverPath}`);
console.log(`API URL: ${env.RAG_API_URL}`);
console.log(`Email: ${env.RAG_USER_EMAIL}\n`);

const server = spawn('/usr/local/bin/node', [serverPath], {
  env,
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

server.stdout.on('data', (data) => {
  output += data.toString();
  console.log('[STDOUT]', data.toString().trim());
});

server.stderr.on('data', (data) => {
  errorOutput += data.toString();
  console.log('[STDERR]', data.toString().trim());
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Send initialize request after a short delay
setTimeout(() => {
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  console.log('\n--- Sending initialize request ---');
  server.stdin.write(JSON.stringify(initRequest) + '\n');

  // After initialize, request tools list
  setTimeout(() => {
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };

    console.log('\n--- Sending tools/list request ---');
    server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

    // Wait a bit then exit
    setTimeout(() => {
      console.log('\n--- Stopping server ---');
      server.kill();
      process.exit(0);
    }, 2000);
  }, 1000);
}, 500);

// Handle server exit
server.on('exit', (code) => {
  console.log(`\nServer exited with code ${code}`);
  if (code !== 0 && code !== null) {
    console.error('\nError output:', errorOutput);
    process.exit(1);
  }
});
