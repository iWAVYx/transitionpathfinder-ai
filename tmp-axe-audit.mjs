import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const url = process.argv[2] || 'http://localhost:8080/demo/report';
const browser = await chromium.launch({ executablePath: '/bin/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const results = await new AxeBuilder({ page }).analyze();
console.log('URL:', url);
console.log('Violations:', results.violations.length);
console.log('Passes:', results.passes.length, '| Incomplete:', results.incomplete.length);
for (const v of results.violations) {
  console.log(`\n[${v.impact}] ${v.id}: ${v.help}`);
  for (const n of v.nodes.slice(0, 3)) {
    console.log('  target:', n.target.join(' '));
    console.log('  summary:', n.failureSummary?.split('\n').slice(0,3).join(' | '));
  }
}
await browser.close();
