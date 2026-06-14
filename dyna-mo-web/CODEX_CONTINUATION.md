# Codex continuation brief — Dyna-MO PTM web interface, NAR submission grade

> **复制下面"开始 prompt"段直接喂给 codex.**
> 上下文文件是 `dyna-mo-web/CODEX_BRIEF.md` (你之前发的初版规格), 工作区是 `C:\Users\lkn\Desktop\Dyna-MO PTM\dyna-mo-web\`.
> 目标: 把网站推到 **NAR Database issue 投稿可用** 的程度, 编辑能点 URL 验证.

---

## 开始 prompt (从下一行起复制)

你好 codex.

我现在要把 Dyna-MO PTM 这个网站推到 NAR Database issue 投稿可用的程度。你之前按 `dyna-mo-web/CODEX_BRIEF.md` 起的脚手架我没动过, 现在请你接着干。**第一件事先汇报当前实际状态**, 然后按下面 acceptance criteria 一项项补齐。

### 1. 先汇报状态 (3 分钟, 写在 `dyna-mo-web/STATUS.md`)

回答 11 个问题:

1. 用了什么栈? (Vite + 什么? React / Vue / Svelte / SvelteKit / Next / ...)
2. 仓库根目录结构 `tree -L 2 dyna-mo-web/` 贴一下
3. `npm run dev` 现在能跑吗? 跑起来是什么页面?
4. 当前有几个 route? 分别是什么?
5. 1,095 系统的 descriptor 数据从哪儿读? (是不是 `submission/master_table_all_v2.csv`, 还是已经拷贝成 JSON?)
6. AF3 起始 PDB 文件 (在 `inputs/all_ptm_pdbs.tar.gz`, 至少 K/R-PTM 那部分齐, phos 那部分待师姐) 当前有没有解压 / 挂上来?
7. 3D viewer 选了哪个库? (NGL Viewer / Mol* / 3Dmol.js / 别的)
8. 表格虚拟化用了什么? (TanStack Table / AG Grid / 自己写的)
9. 部署目标定了吗? (GitHub Pages / Cloudflare Pages / Vercel / zju 内网)
10. 当前 build size 多大?
11. 已经测过哪些功能 (列出"能跑"的 + "还不能跑"的)

### 2. NAR Database issue 接收标准下的功能验收 (8 项)

| # | 功能 | Acceptance criteria | Done? |
|---|---|---|---|
| **F1** | 公网 URL 可访问 | 至少 https 部署到一个稳定域名 (GitHub Pages 子域名也行); 编辑能 click | [ ] |
| **F2** | Home page | 1 页, 含 dataset 简介 + 6 PTM 计数 + 总 MD 时长 (32.85 μs) + "Browse" / "Citation" / "Download" 三个明显入口 + 对应论文 placeholder citation (论文 DOI 待接收后填) | [ ] |
| **F3** | Browse page | 表格列出 1,095 系统, 虚拟化, 至少展示 12 列 (system / uniprot / ptm_type / site / n_residues / rmsd_equil / rg_mean / rmsf_mean / chi1_dominant / site_ss_dominant / site_plddt / final_flag); 列可排序, ptm_type 可 chip-filter, uniprot 可全文搜 | [ ] |
| **F4** | Per-system page (`/system/[id]`) | 4 块: (a) 元数据 (UniProt link out 到 uniprot.org, PTM type, modified residue index, CCD code) (b) 完整 descriptor 表 (100+ 列展开成 key-value, 分组成 Provenance / QC / Site biophysics / Site context 四 block) (c) **3D viewer**: 加载该体系 AF3 input PDB, **HETATM 修饰残基要明显高亮** (不同色 + 大球, 或拉一条注释标签), pLDDT 染色 (蓝高红低 是 AF3 标准色) (d) Download 链接: 原 PDB / Zenodo trajectory bundle (链接 placeholder 现在指 Zenodo restricted page) | [ ] |
| **F5** | Search & filter | `/browse?ptm_type=phos_Y&min_length=200&max_length=500&dssp=H` 这种 URL 参数都能解析 + 表格响应; UniProt 全文搜在 client 即可 (1095 行不需要后端) | [ ] |
| **F6** | About / Methods page | 1 页, 复制 manuscript Abstract + Methods 摘要 + 数据生成协议 + 引用方式 (现在 placeholder); 引用方式给 BibTeX 块和 RIS 块都贴上, 用户能 copy | [ ] |
| **F7** | JSON-LD landing pages for discoverability | 每个 `/system/[id]` 页面 `<head>` 里塞一个 schema.org/Dataset JSON-LD block (内容包括 name / description / creator / license / distribution / sameAs UniProt); 这样 Google Dataset Search 能索引到 | [ ] |
| **F8** | API / programmatic access | 至少有 `/api/systems.json` (整个 master_table 序列化) 和 `/api/system/[id].json` (单系统的 100+ 列 + AF3 PDB CDN URL) 两个端点, static JSON 即可 | [ ] |

### 3. 性能 + 可用性硬指标

- [ ] Home page LCP (Largest Contentful Paint) **< 2.5s** 在普通 4G + 中端 phone
- [ ] Browse page 1,095 行表格无卡顿 (virtualized scroll, 60 fps)
- [ ] 3D viewer 加载一个典型蛋白 (~300 residues) **< 3s** to interactive
- [ ] 全站 Lighthouse score: Performance ≥ 80, Accessibility ≥ 90, SEO ≥ 90
- [ ] 移动端布局 OK (iPhone Safari + Android Chrome)
- [ ] 暗色模式可选 (可省, 但加分)

### 4. SEO + 索引

- [ ] `robots.txt` 允许全站索引
- [ ] `sitemap.xml` 含 1,095 个 `/system/[id]` + 4 个主页面
- [ ] Open Graph + Twitter Card meta tags (一张默认 Fig.1 PNG 作为 og:image)
- [ ] favicon
- [ ] Google Dataset Search 提交 (用 JSON-LD)

### 5. 部署

- [ ] 选定 hosting 方案 (推荐 **GitHub Pages** 配 custom domain, 简单又免费; 备选 Cloudflare Pages)
- [ ] CI/CD: push 到 main 自动 build + deploy
- [ ] 部署成功后, **URL 直接告诉我** (写到 `dyna-mo-web/STATUS.md` 顶部, 用 # 一级标题), 我要把它填进论文
- [ ] 给个**截图存证** (home + browse + 一个 per-system 页, 3 张 PNG), 投稿 cover letter 要用

### 6. 文档 + 交付

- [ ] `dyna-mo-web/README.md`: 怎么本地跑, 怎么改 descriptor 数据源, 怎么部署
- [ ] `dyna-mo-web/USER_GUIDE.md`: 用户怎么 browse / 怎么 export 子集 / 怎么用 API
- [ ] commit 到 git 同时 push 到 GitHub Pages

### 7. 数据 ingestion 路径 (重要!)

**descriptor 源文件**: `../submission/master_table_all_v2.csv` (1,095 × 102, v0.2.1 schema). **不要硬编码 100 列**, 用 schema_version 列分流 — 这是 v0.2.1 引入的 forward-compatibility 机制, v0.3 会加列, 你的 parser 要能不挂。

**AF3 input PDB**: `../inputs/all_ptm_pdbs.tar.gz` (~1.2 GB), 解压后每个体系一个 `<system_id>/raw.pdb`。pLDDT 在 B-factor 列, 修饰残基是 HETATM 行 (SEP/TPO/PTR/ALY/MLZ/AGM)。**phos 那 341 个体系的 PDB 我们暂时没有 (师姐手里), 你的代码应该 graceful 处理"PDB 不存在"的情况** — 显示一个 "AF3 input pending v0.3" 占位图标, browse 表格里这一行的 "View 3D" 按钮 disabled。

**Trajectory 文件**: TB 级, 不上 web, Per-system 页只给 Zenodo bundle 的 link out。

### 8. 投稿时间线

- 我希望 **8 月底前** 网站 live, 至少 F1-F4 + F8 都过 (F5-F7 可以宽松一点)
- 9 月初 NAR 投稿, 编辑会点 URL 验证
- 接收后 (大约 12 月), Zenodo + GitHub 全转 public, 论文 DOI 填进 home 页 citation 块
- 长期 (≥5 年) 维护承诺 — 这一点不需要你做, 但 hosting 方案要选**稳定免费**的, 别选会停服务的小厂

### 9. 优先级排序 (如果时间紧)

1. **必须**: F1 + F2 + F3 + F4 + F8 + 5 部署
2. **强烈推荐**: F5 + F7 + 4 性能指标
3. **可投稿后再补**: F6 (about page 内容可以等论文接收) + Lighthouse 完美分

---

## (Codex prompt 结束)

---

# (本文件其余部分给你 [刘铠宁] 看, 不是给 codex 的)

## 怎么用这份 prompt

1. 把 "开始 prompt" 到 "(Codex prompt 结束)" 之间整段 **复制**
2. 进 codex 项目 (你应该已经在 `dyna-mo-web/` 这个工作目录下跟它对话)
3. 粘贴, 让它先汇报状态再开干
4. 第一轮回复你应该收到 `dyna-mo-web/STATUS.md`, 检查它说的状态对不对
5. 然后让它按 F1-F8 顺序推进

## 给 codex 的边界 (别让它扩展)

- **不要**让它去改 submission/manuscript_v1_NAR.md, scripts/md_analysis/, methods_section.md — 那些是论文域
- **不要**让它扩展数据 (跑新 MD 之类), 它没那个权限
- **可以**让它写 dyna-mo-web/ 下任何东西, 加新依赖, 改部署配置
- **可以**让它跟 submission/master_table_all_v2.csv 跟 inputs/all_ptm_pdbs.tar.gz 只读交互

## 不归 codex 的事 (你自己 / 我做)

- 论文里填 web URL — codex 部署完汇报 URL 给我, 我手动填进 manuscript
- Zenodo DOI — 不归网站, 你自己上传 trajectory 后拿到 DOI 填进 manuscript
- GitHub repo 是 Private 还是 Public 切换 — 投稿前你决定
- 网站的 long-term 维护 — codex 不负责; 论文接收后你或老师组里某人接手
