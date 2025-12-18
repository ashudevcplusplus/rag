#!/usr/bin/env node

/**
 * Screenshot Capture Script for Landing Page
 * 
 * This script captures screenshots of the landing page for documentation and PR reviews.
 * 
 * Prerequisites:
 * - npm install puppeteer --save-dev
 * - Google Chrome installed (or modify executablePath)
 * 
 * Usage:
 * 1. Start the dev server: npm run dev
 * 2. Run this script: node scripts/capture-screenshots.mjs
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotsDir = join(__dirname, '..', 'screenshots');

const VIEWPORT_DESKTOP = { width: 1440, height: 900 };
const VIEWPORT_MOBILE = { width: 375, height: 812 };
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureScreenshots() {
  // Create screenshots directory
  await mkdir(screenshotsDir, { recursive: true });

  console.log('🚀 Starting screenshot capture...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    // Modify this path based on your system
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  });

  const page = await browser.newPage();
  
  // Desktop viewport
  await page.setViewport(VIEWPORT_DESKTOP);

  console.log(`📍 Navigating to ${BASE_URL}...`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Wait for animations to complete
  await delay(3000);

  // Screenshot 1: Hero section
  console.log('📸 1/7 Capturing Hero section...');
  await page.screenshot({ 
    path: join(screenshotsDir, '01-hero-section.png'),
    fullPage: false 
  });

  // Screenshot 2: Product Demo (scroll down)
  console.log('📸 2/7 Capturing Product Demo...');
  await page.evaluate(() => window.scrollBy(0, 600));
  await delay(1000);
  await page.screenshot({ 
    path: join(screenshotsDir, '02-scroll-progress.png'),
    fullPage: false 
  });

  // Screenshot 3: Features section
  console.log('📸 3/7 Capturing Features section...');
  await page.evaluate(() => {
    document.querySelector('#features')?.scrollIntoView({ behavior: 'instant' });
  });
  await delay(1500);
  await page.screenshot({ 
    path: join(screenshotsDir, '03-features-hover.png'),
    fullPage: false 
  });

  // Screenshot 4: Providers showcase
  console.log('📸 4/7 Capturing Providers showcase...');
  await page.evaluate(() => window.scrollBy(0, 600));
  await delay(1000);
  await page.screenshot({ 
    path: join(screenshotsDir, '04-pricing-monthly.png'),
    fullPage: false 
  });

  // Screenshot 5: How It Works
  console.log('📸 5/7 Capturing How It Works...');
  await page.evaluate(() => {
    document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'instant' });
  });
  await delay(1500);
  await page.screenshot({ 
    path: join(screenshotsDir, '05-pricing-yearly.png'),
    fullPage: false 
  });

  // Screenshot 6: Testimonials
  console.log('📸 6/7 Capturing Testimonials...');
  await page.evaluate(() => {
    document.querySelector('#testimonials')?.scrollIntoView({ behavior: 'instant' });
  });
  await delay(1500);
  await page.screenshot({ 
    path: join(screenshotsDir, '06-testimonials-hover.png'),
    fullPage: false 
  });

  // Screenshot 7: Mobile view
  console.log('📸 7/7 Capturing Mobile view...');
  await page.setViewport(VIEWPORT_MOBILE);
  await page.evaluate(() => window.scrollTo(0, 0));
  await delay(1500);
  await page.screenshot({ 
    path: join(screenshotsDir, '07-mobile-hero.png'),
    fullPage: false 
  });

  await browser.close();
  
  console.log('\n✅ Screenshots captured successfully!');
  console.log(`📁 Saved to: ${screenshotsDir}`);
}

// Run the script
captureScreenshots().catch((error) => {
  console.error('❌ Error capturing screenshots:', error);
  process.exit(1);
});
