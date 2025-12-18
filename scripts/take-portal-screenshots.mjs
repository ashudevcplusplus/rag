import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const API_BASE = 'http://localhost:8000';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForViteReady(proc, { timeoutMs = 60_000 } = {}) {
  const start = Date.now();
  return await new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const check = () => {
      const combined = `${stdout}\n${stderr}`;
      if (combined.includes(BASE_URL)) return resolve(true);
      // Vite sometimes prints localhost even when bound to 127.0.0.1
      if (combined.includes(`http://localhost:${PORT}`)) return resolve(true);
      if (Date.now() - start > timeoutMs) {
        return reject(
          new Error(
            `Timed out waiting for Vite dev server on ${BASE_URL}. Output:\n${combined}`
          )
        );
      }
      return undefined;
    };

    const onData = (buf, which) => {
      const text = buf.toString();
      if (which === 'stdout') stdout += text;
      else stderr += text;
      check();
    };

    proc.stdout?.on('data', (buf) => onData(buf, 'stdout'));
    proc.stderr?.on('data', (buf) => onData(buf, 'stderr'));

    const interval = setInterval(check, 250);
    proc.on('exit', (code) => {
      clearInterval(interval);
      reject(
        new Error(
          `Vite dev server exited early (code ${code}). Output:\n${stdout}\n${stderr}`
        )
      );
    });
  });
}

function startPortalDevServer() {
  const args = [
    '--filter',
    '@rag/company-portal',
    'dev',
    '--host',
    '127.0.0.1',
    '--port',
    String(PORT),
    '--strictPort',
  ];

  const proc = spawn('pnpm', args, {
    cwd: ROOT,
    env: {
      ...process.env,
      BROWSER: 'none',
      CI: '1',
      FORCE_COLOR: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return proc;
}

function buildAuthStorage() {
  const companyId = 'company_123';
  const state = {
    user: {
      _id: `${companyId}_user_1`,
      companyId,
      email: 'jane.doe@company.com',
      emailVerified: true,
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'OWNER',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    company: {
      _id: companyId,
      name: 'Acme Inc',
      slug: 'acme-inc',
      email: 'jane.doe@company.com',
      subscriptionTier: 'PROFESSIONAL',
      storageLimit: 5_368_709_120,
      storageUsed: 123_456_789,
      maxUsers: 10,
      maxProjects: 50,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    apiKey: 'test_api_key',
    companyId,
    apiUrl: API_BASE,
    isAuthenticated: true,
    isLoading: false,
  };

  return { state, version: 0 };
}

function mockProjectsResponse(companyId) {
  const now = new Date().toISOString();
  return {
    projects: [
      {
        _id: 'project_1',
        companyId,
        name: 'Customer Support',
        slug: 'customer-support',
        description: 'Internal KB and support playbooks',
        status: 'ACTIVE',
        color: '#3b82f6',
        fileCount: 12,
        vectorCount: 342,
        createdAt: now,
        updatedAt: now,
      },
    ],
    pagination: {
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };
}

function mockCompanyStats() {
  return {
    userCount: 3,
    projectCount: 1,
    fileCount: 12,
    storageUsed: 123_456_789,
    storageLimit: 5_368_709_120,
  };
}

function mockSearchResponse() {
  return {
    results: [
      {
        id: 'result_1',
        score: 82.5,
        payload: {
          projectId: 'project_1',
          projectName: 'Customer Support',
          originalFilename: 'support-handbook.pdf',
          chunkIndex: 3,
          totalChunks: 10,
          content:
            'To reset a user password, go to Settings → Users, select the user, and click “Reset password”.',
        },
      },
    ],
  };
}

async function main() {
  const screenshotsDir = path.join(ROOT, 'apps', 'company-portal', 'screenshots');
  await fs.mkdir(screenshotsDir, { recursive: true });

  console.log(`[screenshots] Starting portal dev server on ${BASE_URL}…`);
  const viteProc = startPortalDevServer();
  try {
    await waitForViteReady(viteProc);
    console.log('[screenshots] Portal dev server is ready.');

    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    // Seed auth before app loads
    const authStorage = buildAuthStorage();
    const appStorage = {
      state: { sidebarOpen: true, searchCount: 0, recentActivities: [] },
      version: 0,
    };

    await context.addInitScript(
      ([auth, app]) => {
        window.localStorage.setItem('rag-auth-storage', JSON.stringify(auth));
        window.localStorage.setItem('rag-app-storage', JSON.stringify(app));
      },
      [authStorage, appStorage]
    );

    // Mock API calls so the UI renders without a backend
    await context.route(`${API_BASE}/**`, async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const method = req.method();

      // Health
      if (url.pathname === '/health' && method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'ok' }),
        });
      }

      // Company stats
      if (/^\/v1\/companies\/[^/]+\/stats$/.test(url.pathname) && method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockCompanyStats()),
        });
      }

      // Projects list
      const projectsMatch = url.pathname.match(/^\/v1\/companies\/([^/]+)\/projects$/);
      if (projectsMatch && method === 'GET') {
        const companyId = projectsMatch[1];
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockProjectsResponse(companyId)),
        });
      }

      // Search (delay to capture loading spinner)
      const searchMatch = url.pathname.match(/^\/v1\/companies\/([^/]+)\/search$/);
      if (searchMatch && method === 'POST') {
        await delay(1500);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockSearchResponse()),
        });
      }

      // Fallback: avoid real network
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    const page = await context.newPage();

    // 1) Dashboard (shows shortcut hint pill)
    console.log('[screenshots] Capturing dashboard shortcut hint…');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header');
    await page.waitForSelector('text=Search...');
    await page.screenshot({
      path: path.join(screenshotsDir, '01-dashboard-shortcut-hint.png'),
      fullPage: true,
    });

    // 2) Keyboard shortcuts modal (Modal focus trap + unique aria ids)
    console.log('[screenshots] Capturing modal focus trap…');
    await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
    await page.waitForSelector('text=Keyboard Shortcuts');
    // Move focus to show focus ring in screenshot
    await page.keyboard.press('Tab');
    await page.screenshot({
      path: path.join(screenshotsDir, '02-modal-focus-trap.png'),
      fullPage: true,
    });

    // 3) Search loading button (Button uses Spinner)
    console.log('[screenshots] Capturing button loading spinner…');
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('textarea');
    await page.fill('textarea', 'How do I reset a password?');
    await page
      .locator('form')
      .getByRole('button', { name: 'Search', exact: true })
      .click();
    await page.waitForSelector('button[aria-busy="true"]');
    await page.screenshot({
      path: path.join(screenshotsDir, '03-button-loading-spinner.png'),
      fullPage: true,
    });

    await browser.close();
    console.log(`[screenshots] Done. Saved PNGs to ${screenshotsDir}`);
  } finally {
    // Stop dev server
    console.log('[screenshots] Stopping portal dev server…');
    viteProc.kill('SIGTERM');
    // Give it a moment to exit cleanly
    await delay(500);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
