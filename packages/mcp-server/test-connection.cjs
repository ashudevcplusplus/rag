#!/usr/bin/env node
/**
 * Simple test script to verify MCP server API client works
 * This tests the API connection and authentication
 */

const { ApiClient } = require('./dist/api-client.js');

async function testConnection() {
  console.log('Testing RAG MCP Server API Connection...\n');

  const config = {
    apiBaseUrl: process.env.RAG_API_URL || 'http://localhost:8000',
    email: process.env.RAG_USER_EMAIL || 'john.doe@acme-corp.com',
    password: process.env.RAG_USER_PASSWORD || 'password123',
  };

  console.log(`API URL: ${config.apiBaseUrl}`);
  console.log(`Email: ${config.email}`);
  console.log('Password: [HIDDEN]\n');

  const client = new ApiClient(config);

  try {
    // Test 1: Health check (no auth required)
    console.log('1. Testing API health check...');
    const health = await client.healthCheck();
    console.log('✓ Health check passed:', JSON.stringify(health, null, 2));
    console.log('');

    // Test 2: Initialize authentication
    console.log('2. Testing authentication...');
    await client.initialize();
    const authState = client.getAuthState();
    if (authState) {
      console.log('✓ Authentication successful!');
      console.log(`  User: ${authState.user.email}`);
      console.log(`  Company ID: ${authState.companyId}`);
      console.log(`  Token: ${authState.token.substring(0, 20)}...`);
    } else {
      console.log('✗ Authentication failed - no auth state');
      process.exit(1);
    }
    console.log('');

    // Test 3: Get company details
    console.log('3. Testing company details...');
    const company = await client.getCompany();
    console.log('✓ Company details retrieved:', JSON.stringify(company, null, 2));
    console.log('');

    // Test 4: List projects
    console.log('4. Testing project list...');
    const projects = await client.listProjects();
    console.log('✓ Projects retrieved:', JSON.stringify(projects, null, 2));
    console.log('');

    console.log('✅ All tests passed! MCP server is ready to use.');
    console.log('\nTo use with Cursor:');
    console.log('1. Restart Cursor completely');
    console.log('2. The MCP server will connect automatically');
    console.log('3. Use natural language with your AI agent to interact with the RAG API');

  } catch (error) {
    console.error('✗ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

testConnection();
