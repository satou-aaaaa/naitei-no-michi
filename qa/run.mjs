// ノベルゲームの自動検査（Claude を使わず CI で回す）。
// ブラウザで index.html を開き、選択肢をランダムに選んで最後まで遊ぶのを繰り返し、次を見る。
//   ❌ 失敗にするもの: JS のエラー（pageerror / console.error）、押せるものが無くて止まる、手数の上限までに終わらない
//   ⚠️ 知らせるだけ: 一度も到達しなかったエンディングがあるとき（回数が少ないと出ることがある）
//   📊 報告: エンディングごとの到達数
// 同じページで「もう一度」を押して続けるので、2周目以降の表示（評価メモなど）も通る。
// 使い方: node qa/run.mjs [--games 60] [--seed 1] [--out qa-report]
//   乱数は種で固定するので、失敗した回は同じ種と回数で再現できる。
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((s) => s.trim().split(/\s+/)));
const GAMES = +(args.games || 60);
const SEED = +(args.seed || 1);
const OUT = args.out || 'qa-report';
const MAX_STEPS = 300; // 1周のクリック数の上限
const ENDINGS = 4; // README「エンディングは4種類」
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(resolve(root, 'index.html')).href;

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
// 乱数を種で固定（mulberry32）
await page.addInitScript((s) => {
  let a = s >>> 0;
  Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}, SEED);
await page.goto(url);

const ends = {}; const failures = [];
for (let g = 0; g < GAMES; g++) {
  let done = false;
  for (let i = 0; i < MAX_STEPS; i++) {
    const t = await page.evaluate(() => {
      const again = document.getElementById('again');
      if (again) { const h = document.querySelector('.ending h2')?.textContent || '(題なし)'; again.click(); return 'END:' + h; }
      const cs = [...document.querySelectorAll('.choice')].filter((b) => !b.disabled);
      if (cs.length) { cs[Math.floor(Math.random() * cs.length)].click(); return 'c'; }
      const adv = document.getElementById('adv');
      if (adv) { adv.click(); return 'a'; }
      return 'stuck';
    });
    if (t.startsWith('END:')) { const h = t.slice(4); ends[h] = (ends[h] || 0) + 1; done = true; break; }
    if (t === 'stuck') {
      const ch = await page.evaluate(() => document.getElementById('chapter')?.textContent || '');
      failures.push(`${g + 1}周目: 押せるものが無くて止まった（章: ${ch}）`); break;
    }
  }
  if (!done && failures.length === 0) failures.push(`${g + 1}周目: ${MAX_STEPS} 回押しても終わらない`);
  if (failures.length) break;
}
mkdirSync(OUT, { recursive: true });
await page.screenshot({ path: resolve(OUT, 'last.png'), fullPage: true });
await browser.close();

const warns = Object.keys(ends).length < ENDINGS ? [`到達したエンディングは ${Object.keys(ends).length} / ${ENDINGS} 種類`] : [];
const ok = failures.length === 0 && errors.length === 0;
const lines = [
  `## 自動プレイの検査 ${ok ? '✅' : '❌'}`, '',
  `- 周回: ${GAMES}（種 ${SEED}）`,
  ...failures.map((f) => `- ❌ ${f}`),
  ...[...new Set(errors)].slice(0, 10).map((e) => `- ❌ ${e}`),
  ...warns.map((w) => `- ⚠️ ${w}`), '',
  '| エンディング | 回数 |', '| --- | --- |',
  ...Object.entries(ends).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`), '',
];
writeFileSync(resolve(OUT, 'report.md'), lines.join('\n'));
console.log(lines.join('\n'));
process.exit(ok ? 0 : 1);
