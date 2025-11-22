import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const OUT_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Realistic templates to avoid repetition compression
const PARAGRAPHS = [
  'The refund policy strictly states that all returns must be processed within 14 business days of receipt. Exceptions are made for defective merchandise.',
  'Engineering guidelines dictate that all pull requests must have at least two approvals before merging into the main branch to ensure code quality.',
  'Quarterly earnings reports indicate a strong growth in the Asia-Pacific region, driven primarily by the adoption of our new cloud services.',
  'Security protocols require multi-factor authentication for all remote access VPN connections. Violations will result in immediate access revocation.',
  'The project roadmap for Q4 includes the migration of the legacy monolith to a microservices architecture using Kubernetes.',
  'Customer support SLAs mandate a first response time of under 15 minutes for all critical incidents reported via the enterprise portal.',
  'Data retention policies ensure that user logs are kept for exactly 90 days before being securely purged from the active database.',
  'The onboarding documentation provides a comprehensive overview of the system architecture, including diagrams of the load balancer configuration.',
  'Supply chain disruptions have caused a 3-week delay in the shipment of new server hardware, impacting the data center expansion timeline.',
  'Performance benchmarks show that the new caching layer has reduced database read latency by approximately 40% during peak traffic.',
  'Compliance audits revealed minor discrepancies in the access control logs, which have been addressed through automated reconciliation scripts.',
  'The disaster recovery plan specifies RPO and RTO targets of 1 hour and 4 hours respectively for all mission-critical systems.',
  'Marketing analytics demonstrate a 25% increase in conversion rates following the implementation of personalized recommendation algorithms.',
  'Infrastructure costs were reduced by 18% after migrating from bare metal servers to containerized workloads on managed Kubernetes.',
  'The API gateway now enforces rate limiting of 1000 requests per minute per client to prevent abuse and ensure fair resource allocation.',
];

function seededRandom(seed: string) {
  let h = crypto.createHash('sha256').update(seed).digest();
  let idx = 0;
  return () => {
    const val = h.readUInt32BE(idx % (h.length - 4)) >>> 0;
    idx = (idx + 4) % h.length;
    if (idx >= h.length) {
      // Re-hash to get more random values
      h = crypto.createHash('sha256').update(h).digest();
      idx = 0;
    }
    return val / 0xffffffff;
  };
}

function generateFile(filename: string, targetBytes: number, seed = 'default') {
  const filePath = path.join(OUT_DIR, filename);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    if (Math.abs(stats.size - targetBytes) < 1024) {
      // Within 1KB tolerance
      console.log(
        `⏩ Skipping ${filename} (already exists, ${(stats.size / 1024 / 1024).toFixed(2)} MB)`
      );
      return;
    }
  }

  console.log(`📝 Generating ${filename} (${(targetBytes / 1024 / 1024).toFixed(1)} MB)...`);
  const rand = seededRandom(seed + filename);
  const stream = fs.createWriteStream(filePath);

  let currentBytes = 0;
  let lineCount = 0;

  while (currentBytes < targetBytes) {
    const template = PARAGRAPHS[Math.floor(rand() * PARAGRAPHS.length)];
    // Add entropy so identical paragraphs don't compress unrealistically
    const entropy = Math.random().toString(36).substring(2, 10);
    const lineNum = ++lineCount;
    const line = `[Line ${lineNum}] ${template} [Ref: ${entropy}]\n\n`;

    const buf = Buffer.from(line);
    stream.write(buf);
    currentBytes += buf.length;
  }

  stream.end();
  return new Promise<void>((resolve) => stream.on('finish', resolve));
}

async function main() {
  const mode = process.argv.includes('--large')
    ? 'large'
    : process.argv.includes('--full')
      ? 'full'
      : 'smoke';

  console.log(`🧪 Test Data Generator [Mode: ${mode}]`);
  console.log(`📁 Output Directory: ${OUT_DIR}\n`);

  const files =
    mode === 'large'
      ? [
          // Large files for stress testing (up to 50MB API limit)
          { name: '10mb.txt', size: 10 * 1024 * 1024 },
          { name: '20mb.txt', size: 20 * 1024 * 1024 },
          { name: '30mb.txt', size: 30 * 1024 * 1024 },
          { name: '40mb.txt', size: 40 * 1024 * 1024 },
          { name: '50mb.txt', size: 50 * 1024 * 1024 }, // At API limit
        ]
      : mode === 'full'
        ? [
            { name: '1mb.txt', size: 1 * 1024 * 1024 },
            { name: '5mb.txt', size: 5 * 1024 * 1024 },
            { name: '10mb.txt', size: 10 * 1024 * 1024 },
            { name: '15mb.txt', size: 15 * 1024 * 1024 },
            { name: '20mb.txt', size: 20 * 1024 * 1024 },
            { name: '30mb.txt', size: 30 * 1024 * 1024 },
            { name: '45mb.txt', size: 45 * 1024 * 1024 },
          ]
        : [{ name: '1mb.txt', size: 1 * 1024 * 1024 }]; // Smoke test file

  const startTime = Date.now();

  for (const f of files) {
    await generateFile(f.name, f.size, 'seed_v1');
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Test data generation complete in ${elapsed}s`);
  console.log(`📊 Generated ${files.length} file(s)`);

  // Print directory contents
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  console.log(`💾 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

if (require.main === module) main();
