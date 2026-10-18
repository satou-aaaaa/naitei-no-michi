# CLAUDE.md

転職ノベルゲーム「内定への道」。ビルド不要の単体HTML（`index.html`、外部ライブラリなし）。物語の元ネタは `docs/aruaru.md`。

## push する前の確認

```bash
cd qa && npm ci && npx playwright install chromium && cd ..
node qa/run.mjs --games 60          # 失敗した回は同じ --seed と --games で再現できる
```

- JS エラー・押せるものが無くて止まる・終わらないは ❌。到達しなかったエンディングがあれば ⚠️。
- 画面の作り（`.choice`・`#adv`・`#again`・`.ending h2`）を変えたら `qa/run.mjs` も合わせて直す。

## 公開

- GitHub Pages は `main` のルート（`/`）を公開する。マージすれば反映される。
- PR の QA が ✅ になると `automerge.yml` が自動でマージする。止めたいときは下書きにするか、ラベル「自動マージしない」を付ける。
- `changes.html`（更新情報）は Changes ワークフローがマージされた PR の題から作り直す。手で直さない。

## 共通のきまり

- PR の作り方・マージの仕方は satou-aaaaa/shared-workflows の `routines/pr.md`、全体のきまりは `routines/common.md` に従う。
- CI の部品（CI失敗Issue・死活監視・Lighthouse・ブランチ片付け・自動マージ）は shared-workflows の共通部品を呼ぶ。
  リポジトリ側の .github/workflows には呼び出しと設定値だけを書く。
