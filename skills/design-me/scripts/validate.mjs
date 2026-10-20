#!/usr/bin/env node
/**
 * design-me specs 仓库一致性校验
 *
 * 把人工"护栏"转成可执行校验，供自进化/挑刺任务在改完 spec 后运行，
 * 失败则以非零码退出并在 CHANGELOG.md 追记触发。校验项：
 *
 *  V1 无 huashu 字样残留（全仓设计文案不自称对标外部 skill）
 *  V2 specs/ 根下不散落独立 md（子代理提炼细则须在子目录内）
 *  V3 路由覆盖：每个 spec 要么被 SKILL.md 名字提及，要么其所属子目录被 SKILL.md 路由（平台深潜/细则由目录承载）
 *  V4 主 spec 遵循统一结构：设计目标 → 操作流程 → 验收标准；附属文件（平台深潜/细则/清单）豁免结构
  V5 spec 内部引用不指向不存在文件（`specs/...` 相对路径可存在）
 *  V6 回归产物自检落点：design/regression/<域>/ 有产物（除 prd/SELF-CHECK/截图外还有其他文件）时，
 *     必须存在 SELF-CHECK.md 且含 5 维度分项评分行（概念/立意、视觉层级、细节执行、功能性、创新性），
 *     保证「5 维度评审」有落盘复核点而非只在心里评
 *
 * 区分：
 *  - 主 spec：每能力域的 `*_design.md` 核心文件（须完整结构）。
 *  - 附属文件：平台深潜（如 ios/android/harmony）、进阶细则（motion-audio-rules）、checklist（hi-fi-acceptance-checklist）——豁免结构校验，但须被子目录路由承载。
 *
 * 用法：  node scripts/validate.mjs [--json]
 * 退出码：0 全部通过；1 有失败项
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const exit = (code, out) => {
  if (process.argv.includes("--json")) console.log(JSON.stringify(out, null, 2));
  else console.log(out.report.join("\n"));
  process.exit(code);
};

const out = { report: [], failures: 0, checks: {} };
let failed = false;
const fail = (tag, msg) => { out.failures++; failed = true; out.report.push(`✗ [${tag}] ${msg}`); };
const ok = (tag, msg) => out.report.push(`✓ [${tag}] ${msg}`);

/* ---------- 收集 ---------- */
const allFiles = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else allFiles.push(p);
  }
})(root);

const specsDir = join(root, "specs");
const specMds = allFiles.filter((f) => f.startsWith(specsDir) && f.endsWith(".md"));
const skillMd = readFileSync(join(root, "SKILL.md"), "utf8");

/* ---------- V1 huashu 残留 ---------- */
const huashuHits = allFiles
  .filter((f) => f.endsWith(".md"))
  .map((f) => [f, readFileSync(f, "utf8")])
  .filter(([, c]) => /huashu/i.test(c));
if (huashuHits.length) fail("huashu", huashuHits.map(([f]) => f).join(", "));
else ok("huashu", "全仓 .md 无 huashu 字样");

/* ---------- V2 specs 根下散落 md ---------- */
const stray = specMds.filter((f) => !/specs\/[^/]+\//.test(f));
if (stray.length) fail("specs-root", stray.join(", "));
else ok("specs-root", "specs/ 根下无散落 md");

/* ---------- V3 路由覆盖：SKILL.md 提及全部 spec（含目录承载） ---------- */
const missing = [];
const knownDirs = new Set(Array.from(skillMd.matchAll(/specs\/([\w-]+)[/`\s]/g)).map((m) => m[1]));
for (const f of specMds) {
  const rel = f.replace(root + "/", "");
  const sub = f.replace(specsDir + "/", "").split("/")[0];
  // 条件 A：SKILL.md 直接点名该文件；条件 B：其所属子目录在 SKILL.md 路由中被提及
  if (skillMd.includes(rel) || knownDirs.has(sub)) continue;
  missing.push(rel);
}
if (missing.length) fail("route", "SKILL.md 未提及（须指名或所属目录进路由）：" + missing.join(", "));
else ok("route", `SKILL.md 覆盖全部 ${specMds.length} 个 spec（含目录承载）`);

/* ---------- V4 统一结构（仅主 spec，务实断言） ---------- */
// 附属文件 = 平台深潜（*ios/*android/*harmony）、进阶细则、checklist，豁免结构
const isAux = (f) =>
  /\/(?:ios|android|harmony)\.md$/.test(f) ||
  f.endsWith("motion/motion-audio-rules.md") ||
  f.endsWith("workflow/hi-fi-acceptance-checklist.md");
const isMain = (f) => !isAux(f);

const structOk = [], structBad = [];
// 必有「设计目标」；收尾墙至少命中其一（各 spec 命名不一，不强求统一标题）
const hardWall = ["验收标准", "边界与不做项", "收敛条件", "审阅迭代"];
for (const f of specMds) {
  if (!isMain(f)) continue;
  const c = readFileSync(f, "utf8");
  const has = (s) => c.includes(`## ${s}`) || c.includes(`# ${s}`);
  const miss = [];
  if (!has("设计目标")) miss.push("设计目标");
  if (!hardWall.some(has)) miss.push(`收尾（${hardWall.join("/")} 之一）`);
  if (miss.length) structBad.push(`${f.replace(specsDir + "/", "")} 缺:${miss.join("、")}`);
  else structOk.push(f);
}
if (structBad.length) fail("structure", structBad.join(" | "));
else ok("structure", `主 spec（${structOk.length}）均有「设计目标 + ${hardWall.join("/")}之一」`);

/* ---------- V5 内部引用可存在 ---------- */
const refsBad = [];
for (const f of specMds) {
  const c = readFileSync(f, "utf8");
  const refs = c.matchAll(/`(\.\.\/[\w./\-]+\.md)`/g);
  for (const m of refs) {
    const target = resolve(dirname(f), m[1]);
    if (!existsSync(target)) refsBad.push(`${f.replace(root + "/", "")} -> ${m[1]}`);
  }
}
if (refsBad.length) fail("refs", refsBad.join(" | "));
else ok("refs", "spec 内部相对引用均存在");

/* ---------- V6 回归产物自检落点（SELF-CHECK.md + 5 维度评分） ---------- */
const regDir = resolve(root, "..", "design", "regression");
const v6Bad = [];
if (existsSync(regDir)) {
  for (const e of readdirSync(regDir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const dir = join(regDir, e.name);
    const files = [];
    (function w2(d) {
      for (const x of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, x.name);
        if (x.isDirectory()) w2(p);
        else files.push(p);
      }
    })(dir);
    // 有实质产物（排除自检文档/PRD/截图/日志本身）才要求 SELF-CHECK
    const real = files.filter((f) => !/(^|\/)(SELF-CHECK\.md|prd\.md|selftest-log\.md)$/.test(f) && !/\.(png|jpg|jpeg)$/.test(f));
    if (!real.length) continue;
    const sc = files.find((f) => f.endsWith("SELF-CHECK.md"));
    if (!sc) { v6Bad.push(`${e.name}/ 缺 SELF-CHECK.md（产物 ${real.length} 个文件）`); continue; }
    const c = readFileSync(sc, "utf8");
    const dims = ["概念", "视觉层级", "细节执行", "功能性", "创新"];
    const missing = dims.filter((d) => !c.includes(d));
    if (missing.length) v6Bad.push(`${e.name}/SELF-CHECK.md 缺 5 维度评分项:${missing.join("、")}`);
  }
}
if (v6Bad.length) fail("self-check", v6Bad.join(" | "));
else ok("self-check", "回归产物均有 SELF-CHECK.md 且含 5 维度评分项");

/* ---------- V7 Web 产物双态提示重置（style.color 残留） ---------- */
const v7Bad = [];
const regHtmls = [];
if (existsSync(regDir)) {
  (function walkReg(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walkReg(p);
      else if (p.endsWith(".html")) regHtmls.push(p);
    }
  })(regDir);
}
for (const f of regHtmls) {
  const c = readFileSync(f, "utf8");
  const assigns = [...c.matchAll(/([\w$][\w$.]*)\.style\.color\s*=\s*([^;]+);?/g)]
    .map((m) => ({ base: m[1], val: m[2].trim() }))
    .filter(({ val }) => val !== "''" && val !== '""'); // 赋 '' 本身是重置，不算态
  const bases = [...new Set(assigns.map((a) => a.base))];
  if (!bases.length) continue; // 无 style.color 赋色，不适用
  const resetVars = new Set(
    [...c.matchAll(/([\w$][\w$.]*)\.style\.color\s*=\s*['"]{2}|([\w$][\w$.]*)\.style\.removeProperty\(\s*['"]color['"]/g)]
      .flatMap((m) => [m[1], m[2]].filter(Boolean))
  );
  const unreset = bases.filter((b) => !resetVars.has(b));
  if (unreset.length) {
    const rel = f.replace(regDir + "/", "");
    v7Bad.push(`${rel}: 提示区 ${unreset.join(",")} 存在 style.color 赋色但无切换前重置（style.color='' / removeProperty）`);
  }
}
if (v7Bad.length) fail("duotone-reset", v7Bad.join(" | "));
else ok("duotone-reset", "Web 产物双态提示均有切换前重置（或无多态赋色）");

/* ---------- V9 design-system Token 完整性（spec 阶梯同源 + 引用存在 + 文档 CSS 变量同源） ---------- */
const v9Bad = [];
{
  for (const dom of ["design-system", "brand"]) {
    const dDir = join(regDir, dom);
    if (!existsSync(dDir)) continue;
    for (const tj of readdirSync(dDir).filter((f) => f === "tokens.json" || f === "palette.json")) {
      const t = JSON.parse(readFileSync(join(dDir, tj), "utf8"));
      // 1) 全部 {ref} 引用可解析（语义键或 基线.阶）
      const semKeys = new Set(
        Object.keys(t.semantic?.light || {}).concat(Object.keys(t.semantic?.dark || {}))
      );
      const baseKeys = new Set();
      for (const [cat, v] of Object.entries(t.baseline || {})) {
        if (cat === "color") for (const [n, sh] of Object.entries(v)) for (const sk of Object.keys(sh)) if (sk !== "chroma-role") baseKeys.add(`${n}.${sk}`);
        else if (typeof v === "object" && v !== null) for (const k of Object.keys(v)) baseKeys.add(`${cat}.${k}`);
      }
      const broken = [];
      (function walk(o, path) {
        if (typeof o === "string") {
          for (const m of o.matchAll(/\{([\w.-]+)\}/g)) {
            const r = m[1];
            if (!(semKeys.has(r) || baseKeys.has(r) || r.startsWith("motion."))) broken.push(`${path}: {${r}} 无定义`);
          }
        } else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`);
      })(t.components || {}, "components");
      if (broken.length) v9Bad.push(`${dom}/${tj}: 引用悬空 ${broken.slice(0,3).join("; ")}`);
    }
    // 2) token-doc.html（含 critic-round2）:root 的 oklch 变量须在 tokens.json 中存在同值
    for (const sub of ["", "design-system-critic-round2"]) {
      const doc = join(dDir, sub, "token-doc.html");
      const src = join(dDir, sub, "tokens.json");
      if (!existsSync(doc) || !existsSync(src)) continue;
      const c = readFileSync(doc, "utf8");
      const t = JSON.parse(readFileSync(src, "utf8"));
      const jsonVals = new Set();
      (function collect(o){ if (typeof o === "string"){ const m = o.match(/oklch\([^)]*\)/g); if (m) m.forEach(x=>jsonVals.add(x.replace(/\s+/g,""))); } else if (o && typeof o==="object") for (const v of Object.values(o)) collect(v); })(t);
      const rootBlock = (c.match(/:root\s*{([^}]*)}/) || [])[1] || "";
      const cssOk = [...rootBlock.matchAll(/oklch\([^)]*\)/g)].map((m) => m[0].replace(/\s+/g,""));
      const stray = [...new Set(cssOk.filter((v) => !jsonVals.has(v)))];
      if (stray.length) v9Bad.push(`${sub || "."}/token-doc.html: :root 出现 tokens.json 未定义的 oklch 值 ${stray.slice(0,3).join(", ")}`);
    }
  }
}
if (v9Bad.length) fail("ds-token-integrity", v9Bad.join(" | "));
else ok("ds-token-integrity", "design-system Token 引用无悬空、文档 CSS 变量与 tokens.json 同源");

/* ---------- V8 品牌手册 <5% 偏差（Token diff 可执行化，specs/brand 验收项） ---------- */
// design/regression/brand/ 存在 *-brand.html + assets/*-palette.json 时：
// HTML :root 色彩/字体变量与 JSON hex/字体族逐项 diff，不一致项数 >5% 失败
const v8Bad = [];
{
  const bDir = join(regDir, "brand");
  if (existsSync(bDir)) {
    const htmls = readdirSync(bDir).filter((f) => f.endsWith("-brand.html"));
    const palettes = [];
    const aDir = join(bDir, "assets");
    if (existsSync(aDir)) for (const f of readdirSync(aDir)) if (f.endsWith("-palette.json")) palettes.push(join(aDir, f));
    if (htmls.length && palettes.length) {
      const pal = JSON.parse(readFileSync(palettes[0], "utf8"));
      const expect = new Set(pal.colors.map((c) => c.hex.toLowerCase()));
      const fontFam = new Set();
      for (const k of ["display", "body", "label"]) {
        const t = pal.typography?.[k]?.family;
        if (t) fontFam.add(t.split(",")[0].trim().replace(/"/g, ""));
      }
      for (const h of htmls) {
        const c = readFileSync(join(bDir, h), "utf8");
        const rootBlock = (c.match(/:root\s*{([^}]*)}/) || [])[1] || "";
        const vars = [...rootBlock.matchAll(/--[\w-]+:\s*([^;]+);/g)].map((m) => m[1].trim());
        const hexes = vars.filter((v) => /^#[0-9a-f]{3,8}$/i.test(v));
        const mismatch = hexes.filter((v) => !expect.has(v.toLowerCase())).length;
        const fams = vars.filter((v) => v.includes("serif") || v.includes("sans")).length;
        const famHit = vars.some((v) => [...fontFam].some((f) => v.includes(f)));
        const total = hexes.length + fams;
        const bad = mismatch + (fams && !famHit ? fams : 0);
        if (!total) { v8Bad.push(`${h}: :root 无可比对 Token`); continue; }
        if (bad / total > 0.05) v8Bad.push(`${h}: Token diff ${bad}/${total}（${(bad/total*100).toFixed(1)}% > 5%）`);
      }
    }
  }
}
if (v8Bad.length) fail("brand-token-diff", v8Bad.join(" | "));
else ok("brand-token-diff", "品牌手册 :root Token 与色板 diff ≤5%");

/* ---------- V10 品牌资产 SVG 用色治理（specs/brand「色彩不可用未定义色」可执行化） ---------- */
// design/regression/brand{,-critic-round2}/assets/*.svg 的 fill/stroke hex 须在对应 palette.json 内（含 critic-round2）
const brandSvgBad = [];
{
  for (const sub of ["", "/brand-critic-round2"]) {
    const aDir = join(regDir, "brand" + sub, "assets");
    if (!existsSync(aDir)) continue;
    const pals = readdirSync(aDir).filter((f) => f.endsWith("-palette.json") || f === "palette.json");
    if (!pals.length) continue;
    const pal = JSON.parse(readFileSync(join(aDir, pals[0]), "utf8"));
    const palHex = new Set((pal.colors || []).map((c) => (c.hex || "").toUpperCase()));
    for (const f of readdirSync(aDir).filter((f) => f.endsWith(".svg"))) {
      const s = readFileSync(join(aDir, f), "utf8");
      for (const m of s.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,8})"/g)) {
        if (!palHex.has(m[1].toUpperCase())) brandSvgBad.push(`brand${sub || ""}/assets/${f}: ${m[1]} 未入色板`);
      }
    }
  }
}
if (brandSvgBad.length) fail("brand-svg-palette", brandSvgBad.join(" | "));
else ok("brand-svg-palette", "品牌 SVG 资产用色全部在色板内（含单色/反白变体）");

/* ---------- V9 图标集一致性（specs/icon-system 验收可执行化） ---------- */
// design/regression/icon-system/assets/icons/** 有 SVG 时逐文件校验：
// viewBox 一致、stroke-width 取值唯一、线框图标 linecap/linejoin=round、含 currentColor、命名合规
const v10Bad = [];
let v10Count = 0;
{
  // icon-system（ic_*）与 illustration（ill_*）共用结构校验；命名前缀族不同
  const dirs = [
    ["icon-system", "assets/icons", /^ic_(action|nav|status|content|system)_[a-z0-9_]+(_filled)?\.svg$/, "ic_<类别>_<名称>"],
    ["illustration", "assets/icons", /^ill_[a-z0-9_]+\.svg$/, "ill_<场景>_<用途>"],
  ];
  for (const [dom, sub, nameRe, nameDesc] of dirs) {
    const iDir = join(regDir, dom, sub);
    const svgs = [];
    (function walk(d, rel) {
      if (!existsSync(d)) return;
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) walk(join(d, e.name), rel ? rel + "/" + e.name : e.name);
        else if (e.name.endsWith(".svg")) svgs.push({ path: join(d, e.name), rel: (rel ? rel + "/" : "") + e.name });
      }
    })(iDir, "");
    v10Count += svgs.length;
    if (svgs.length) {
      const vbs = new Set();
      const widths = new Set();
      for (const s of svgs) {
        const c = readFileSync(s.path, "utf8");
        const vb = (c.match(/viewBox="([^"]+)"/) || [])[1];
        if (vb) vbs.add(vb);
        for (const w of c.matchAll(/stroke-width="([\d.]+)"/g)) widths.add(w[1]);
        if (!/currentColor/.test(c)) v10Bad.push(`${s.rel}: 缺 currentColor`);
        if (/<text/.test(c)) v10Bad.push(`${s.rel}: 含 <text>（未转曲）`);
        if (!nameRe.test(s.rel.split("/").pop()))
          v10Bad.push(`${s.rel}: 命名不合 ${nameDesc} 规范`);
        if (/stroke="currentColor"/.test(c) && !/stroke-linecap="round"/.test(c))
          v10Bad.push(`${s.rel}: 线框图标端点未统一 round`);
        if (/stroke="currentColor"/.test(c) && /Z/.test((c.match(/d="([^"]+)"/) || [,""])[1]) && !/stroke-linejoin="round"/.test(c))
          v10Bad.push(`${s.rel}: 闭合路径转角未统一 round`);
      }
      if (vbs.size > 1) v10Bad.push(`${dom}: viewBox 不一致：${[...vbs].join(" / ")}`);
      if (widths.size > 1) v10Bad.push(`${dom}: stroke-width 档位混用：${[...widths].join(" / ")}`);
    }
  }
}
if (v10Bad.length) fail("icon-set", v10Bad.join(" | "));
else ok("icon-set", `图标/插画集结构一致性（${v10Count} 枚 SVG：画布/线宽/圆角/currentColor/命名）`);

/* ---------- V11 移动端可交互真实性（specs/mobile M3「可交互」可执行化） ---------- */
// mobile*/ cafero-*.html（含 critic-round2）：onclick/事件声明的函数必须在 <script> 内有定义，禁「注释说有 toast/确认但代码无实现」
const v11Bad = [];
{
  const mDir = join(regDir, "mobile");
  if (existsSync(mDir)) {
    for (const sub of ["", "/mobile-critic-round2"]) {
      const d = join(mDir, sub);
      if (!existsSync(d)) continue;
      for (const f of readdirSync(d).filter((x) => x.endsWith(".html"))) {
        const c = readFileSync(join(d, f), "utf8");
        // 收集 HTML 属性里的函数调用
        const called = new Set();
        for (const m of c.matchAll(/on(?:click|change|input|submit)="([a-zA-Z_$][\w$]*)\(/g)) called.add(m[1]);
        const script = c.slice(c.lastIndexOf("<script>"));
        for (const fn of called) {
          const defined = new RegExp(`function\\s+${fn}\\b`).test(script);
          if (!defined) v11Bad.push(`${sub || "."}/${f}: ${fn}() 被 onclick 引用但未定义（死交互）`);
        }
        // 声明性文案核对：代码注释/文案提到「toast 占位」但无 toast 实现元素 → 摆拍
        if (/toast/i.test(c) && !/(id="toast"|role="status")/.test(c)) v11Bad.push(`${sub || "."}/${f}: 提到 toast 但无 toast 载体`);
      }
    }
  }
}
if (v11Bad.length) fail("mobile-interaction", v11Bad.join(" | "));
else ok("mobile-interaction", "mobile 页面 onclick 函数均有实现、toast 文案有真实载体");

/* ---------- V12 图标着墨范围（specs/icon-system IC1「安全区」可执行化：含描边/端点帽的实际着墨边界，非裸坐标） ---------- */
const v12Bad = [];
{
  const flatten=(d)=>{
    const toks=d.match(/[MmLlHhVvCcSsAaZz]|-?\d*\.?\d+(?:e-?\d+)?/g)||[];
    let i=0, cmd=null, cur=[0,0], start=[0,0];
    const pts=[], num=()=>parseFloat(toks[i++]);
    while(i<toks.length){
      if(/^[A-Za-z]$/.test(toks[i])){ cmd=toks[i++]; if(cmd==="Z"||cmd==="z"){ cur=start; pts.push(cur); continue; } }
      const rel=cmd===cmd.toLowerCase();
      const C=cmd.toUpperCase();
      if(C==="M"||C==="L"){ let x=num(), y=num(); if(rel){x+=cur[0]; y+=cur[1];} cur=[x,y]; if(C==="M") start=cur; pts.push(cur); if(C==="M") cmd=rel?"l":"L"; }
      else if(C==="H"){ let x=num(); if(rel) x+=cur[0]; cur=[x,cur[1]]; pts.push(cur); }
      else if(C==="V"){ let y=num(); if(rel) y+=cur[1]; cur=[cur[0],y]; pts.push(cur); }
      else if(C==="C"||C==="S"){
        let x1,y1,x2,y2,x,y;
        if(C==="C"){ x1=num(); y1=num(); x2=num(); y2=num(); x=num(); y=num(); if(rel){x1+=cur[0];y1+=cur[1];x2+=cur[0];y2+=cur[1];x+=cur[0];y+=cur[1];} }
        else { x2=num(); y2=num(); x=num(); y=num(); if(rel){x2+=cur[0];y2+=cur[1];x+=cur[0];y+=cur[1];} x1=cur[0]; y1=cur[1]; }
        for(let j=1;j<=8;j++){ const t=j/8, mt=1-t;
          pts.push([mt**3*cur[0]+3*mt*mt*t*x1+3*mt*t*t*x2+t**3*x, mt**3*cur[1]+3*mt*mt*t*y1+3*mt*t*t*y2+t**3*y]); }
        cur=[x,y];
      }
      else if(C==="A"){ num();num();num();num();num(); let x=num(), y=num(); if(rel){x+=cur[0];y+=cur[1];} cur=[x,y]; pts.push(cur); }
      else i++; // 未知命令丢弃，防死循环
    }
    return pts;
  };
  const iconRoots = [join(regDir, "icon-system", "assets", "icons"), join(regDir, "icon-system", "icon-system-critic-round2", "assets", "icons")];
  {
    let count = 0;
    for (const iconRoot of iconRoots) {
      if (!existsSync(iconRoot)) continue;
    for (const cat of readdirSync(iconRoot)) {
      const catDir = join(iconRoot, cat);
      if (!statSync(catDir).isDirectory()) continue;
      for (const f of readdirSync(catDir).filter((x) => x.endsWith(".svg"))) {
        count++;
        const s = readFileSync(join(catDir, f), "utf8");
        const sw = parseFloat((s.match(/stroke-width="([\d.]+)"/) || [])[1] || "0");
        const pts = [];
        for (const dm of s.matchAll(/\bd="([^"]+)"/g)) pts.push(...flatten(dm[1]));
        for (const cm of s.matchAll(/<circle cx="([\d.-]+)" cy="([\d.-]+)" r="([\d.-]+)"/g)) {
          const cx=+cm[1], cy=+cm[2], r=+cm[3];
          for (let t=0;t<32;t++) pts.push([cx+r*Math.cos(t/32*2*Math.PI), cy+r*Math.sin(t/32*2*Math.PI)]);
        }
        for (const rm of s.matchAll(/<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.-]+)" height="([\d.-]+)"/g))
          pts.push([+rm[1],+rm[2]],[+rm[1]+ +rm[3],+rm[2]+ +rm[4]]);
        if (!pts.length) { v12Bad.push(`${cat}/${f}: 无法解析着墨范围`); continue; }
        const e = sw/2 + (sw ? 0.08 : 0); // round cap 半圆扩展按半径近似
        const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]);
        const x1=Math.min(...xs)-e, y1=Math.min(...ys)-e, x2=Math.max(...xs)+e, y2=Math.max(...ys)+e;
        if (x1 < 1.9 || y1 < 1.9 || x2 > 22.1 || y2 > 22.1)
          v12Bad.push(`${iconRoot.includes("critic-round2") ? "round2/" : ""}${cat}/${f}: 着墨越安全区 [${x1.toFixed(2)},${y1.toFixed(2)}→${x2.toFixed(2)},${y2.toFixed(2)}]（2px 活区 2..22）`);
      }
    }
    }
    // round1 历史产物的着墨越界不阻塞（终验修复在 critic-round2，round1 冻结留存），但须在通过文案中留痕
    const r1Bad = v12Bad.filter((x) => !x.startsWith("round2/"));
    const r2Bad = v12Bad.filter((x) => x.startsWith("round2/"));
    if (r2Bad.length) fail("icon-ink-bounds", r2Bad.join(" | "));
    else ok("icon-ink-bounds", `图标着墨含描边不越 2px 安全区（${count} 枚数值化扫描${r1Bad.length ? `；round1 历史产物 ${r1Bad.length} 处越界已由 critic-round2 修复` : ""}）`);
  }
}

/* ---------- V14 封面数值复核（specs/cover C4「公式复核不目测」+ C6 导出落点，静态可执行化） ---------- */
{
  const v14Bad = [];
  const coverDirs = [join(regDir, "cover", "cover-critic-round2")].filter(existsSync);
  for (const d of coverDirs) {
    const f = join(d, "cover-matrix.html");
    if (!existsSync(f)) { v14Bad.push(`${d}: 缺 cover-matrix.html`); continue; }
    const html = readFileSync(f, "utf8");
    // (a) 标题字号占画布高 ≥15%：解析 .cv-* h3 的 cqh 值（container-query 下渲染占比=导出占比）
    for (const m of html.matchAll(/\.cv-(mp|xhs|yt) h3 \{[^}]*font-size:([\d.]+)cqh/g)) {
      const pct = parseFloat(m[2]);
      if (pct < 15) v14Bad.push(`cover ${m[1]}: 标题字号 ${pct}% < 15% 画布高（C4）`);
    }
    // (b) 主标题与强调实际用色对比 ≥4.5（WCAG 公式直算）
    const lum = (hex) => {
      const n = hex.replace("#", "");
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const bg = (html.match(/--brand-deep:#([0-9A-Fa-f]{6})/) || [])[1];
    if (bg) {
      const paper = (html.match(/color:#([0-9A-Fa-f]{6})/) || [])[1];
      const acc = (html.match(/--brand-accent-ondeep, #([0-9A-Fa-f]{6})/) || html.match(/ACCENT_ONDEEP=\'#([0-9A-Fa-f]{6})/) || [])[1];
      const cr = (a, b2) => { const [l1, l2] = [lum(a), lum(b2)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };
      if (paper && cr(paper, bg) < 4.5) v14Bad.push(`cover: 主标题对比 ${cr(paper, bg).toFixed(2)} < 4.5（C4）`);
      if (acc && cr(acc, bg) < 4.5) v14Bad.push(`cover: 强调色 ${acc} 对比 ${cr(acc, bg).toFixed(2)} < 4.5（C4，需深底映射）`);
    }
    // (c) C6 正式导出：平台命名 PNG 必须实体存在
    const ad = join(d, "assets");
    for (const plat of ["wechat", "xiaohongshu", "youtube"]) {
      const hit = existsSync(ad) && readdirSync(ad).some((x) => x.startsWith(plat + "_") && x.endsWith(".png"));
      if (!hit) v14Bad.push(`cover: 缺平台导出文件 ${plat}_*.png（C6「矩阵定稿后导出正式文件」）`);
    }
  }
  if (v14Bad.length) fail("cover-metric", v14Bad.join(" | "));
  else ok("cover-metric", "封面标题字号 ≥15% 画布高、主/强调色对比 ≥4.5、3 平台导出 PNG 实体在位");
}

/* ---------- V13 插画色板登记（specs/illustration I3「板外色禁令+暗色须登记」可执行化） ---------- */
{
  const v13Bad = [];
  const illDirs = [join(regDir, "illustration"), join(regDir, "illustration", "illustration-critic-round2")];
  const paletteFiles = [];
  for (const d of illDirs) {
    const ad = join(d, "assets");
    if (!existsSync(ad)) continue;
    for (const f of readdirSync(ad)) if (f.endsWith("-palette.json") || f === "palette.json") paletteFiles.push(join(ad, f));
  }
  const registered = new Set();
  for (const pf of paletteFiles) {
    try {
      const j = JSON.parse(readFileSync(pf, "utf8"));
      for (const col of j.colors || []) {
        if (col.hex) registered.add(col.hex.toUpperCase());
        if (col.dark) registered.add(col.dark.toUpperCase());
      }
    } catch { v13Bad.push(`色板 JSON 解析失败: ${pf}`); }
  }
  let hexCount = 0;
  for (const d of illDirs) {
    const f = join(d, "illustration-set.html");
    if (!existsSync(f)) continue;
    const html = readFileSync(f, "utf8");
    const hexes = [...html.matchAll(/--brand-[a-z-]+:(#[0-9A-Fa-f]{6})/g)].map((m) => m[1].toUpperCase());
    hexCount += hexes.length;
    for (const h of new Set(hexes))
      if (!registered.has(h)) v13Bad.push(`${d.split("/").pop()}: 插画用色 ${h} 未登记进任何 *-palette.json（I3 板外色禁令）`);
  }
  const illPresent = illDirs.some((d) => existsSync(d));
  if (illPresent && !paletteFiles.length) v13Bad.push("illustration 域无任何 *-palette.json 色板登记文件（I3 暗色映射登记无载体）");
  if (!illPresent) ok("ill-palette", "无 illustration 回归产物，跳过色板登记");
  else if (v13Bad.length) fail("ill-palette", v13Bad.join(" | "));
  else ok("ill-palette", `插画色彩全部登记色板（${hexCount} 处 --brand-* hex 对照 ${registered.size} 个登记值，含暗色分支）`);
}

/* ---------- V11 封面标题对比度（specs/cover C4「公式复核不目测」可执行化） ---------- */
// design/regression/cover/*-matrix.html 存在时：提取 .cv 区块内文字色/背景色 hex（含提亮映射），WCAG 比值 ≥4.5
const coverBad = [];
{
  const cDir = join(regDir, "cover");
  if (existsSync(cDir)) {
    const lum = (hex) => {
      const n = hex.replace("#", "");
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    for (const f of readdirSync(cDir).filter((f) => f.endsWith("-matrix.html"))) {
      const s = readFileSync(join(cDir, f), "utf8");
      const bg = (s.match(/\.cv\s*{[^}]*background:\s*(#[0-9a-fA-F]{6})/) || [])[1];
      // 标题主色：.cv h3 前最近的颜色声明；强调色：h3 em 的 color（含 var 兜底值）
      const h3Block = (s.match(/\.cv h3\s*{[^}]*}/) || [""])[0];
      const fg = (s.match(/\.cv\s*{[^}]*color:\s*(#[0-9a-fA-F]{6})/) || [])[1];
      if (bg && fg) {
        const r = ratio(fg, bg);
        if (r < 4.5) coverBad.push(`${f}: 标题 ${fg} on ${bg} = ${r.toFixed(2)}:1 < 4.5`);
      }
      const emBlock = (s.match(/\.cv h3 em\s*{[^}]*}/) || [""])[0];
      const emM = emBlock.match(/#([0-9a-fA-F]{6})/);
      if (bg && emM) {
        const r = ratio("#" + emM[1], bg);
        if (r < 4.5) coverBad.push(`${f}: 强调色 #${emM[1]} on ${bg} = ${r.toFixed(2)}:1 < 4.5（低饱和强调色须逐一验）`);
      }
    }
  }
}
if (coverBad.length) fail("cover-contrast", coverBad.join(" | "));
else ok("cover-contrast", "封面标题/强调色 on 背景对比度 ≥4.5:1（公式实算）");

/* ---------- V12 文案禁词（specs/content 验收可执行化） ---------- */
// design/regression/content/*.html：按钮文本禁「确定/OK/好的」；禁无信息错误文案；订阅场景禁「开通/退订」
const copyBad = [];
{
  const cDir = join(regDir, "content");
  if (existsSync(cDir)) {
    for (const f of readdirSync(cDir).filter((x) => x.endsWith(".html"))) {
      const s = readFileSync(join(cDir, f), "utf8");
      const body = s.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
      for (const m of body.matchAll(/<(button|span)[^>]*>([\s\S]*?)<\/\1>/g)) {
        const txt = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, "").trim();
        if (/^(确定|OK|好的)$/.test(txt)) copyBad.push(`${f}: 按钮文案「${txt}」（动词开头规则）`);
      }
      // 术语表（table.term）是规范展示：禁用词/说明列合法出现；整表剥掉再查
      const noBan = body.replace(/<table class="term"[^>]*>[\s\S]*?<\/table>/g, "");
      for (const w of ["出错了", "操作失败"]) {
        if (noBan.includes(w)) copyBad.push(`${f}: 含无信息错误文案「${w}」`);
      }
      for (const w of ["开通会员", "退订"]) {
        if (noBan.includes(w)) copyBad.push(`${f}: 订阅场景禁用词「${w}」（统一「订阅/取消订阅」）`);
      }
    }
  }
}
if (copyBad.length) fail("copy-set", copyBad.join(" | "));
else ok("copy-set", "文案集无禁用按钮词/无信息错误文案/订阅术语一致");

/* ---------- V18 审阅导出失败可见 + 自检完整性（specs/review「降级路径」+ V6 自检反摆拍） ---------- */
{
  const v18Bad = [];
  // (a) review 产物含 FSAA 时：用户取消（AbortError）必须有捕获分支——取消≠不支持，未捕获=保存静默中断
  const rvDir = join(regDir, "review", "review-critic-round2");
  if (existsSync(rvDir)) {
    for (const f of readdirSync(rvDir).filter((x) => x.endsWith(".html"))) {
      const s = readFileSync(join(rvDir, f), "utf8");
      if (s.includes("showDirectoryPicker") && !/AbortError/.test(s))
        v18Bad.push(`review/${f}: showDirectoryPicker 无 AbortError（用户取消）捕获分支——取消后保存中断且无提示`);
    }
  }
  // (b) 自检完整性：critic-round2 起 SELF-CHECK.md 不得只有评分表（逐条核对缺位 = 自检摆拍）
  if (existsSync(regDir)) for (const d of readdirSync(regDir)) {
    const dd = join(regDir, d);
    let dt;
    try { dt = readdirSync(dd, { withFileTypes: true }); } catch { continue; }
    if (!dt.some(x => x.isDirectory())) continue;
    const subs = ["", ...readdirSync(dd, { withFileTypes: true }).filter(x => x.isDirectory()).map(x => x.name)];
    for (const sub of subs) {
      const sc = join(dd, sub, "SELF-CHECK.md");
      if (existsSync(sc)) {
        const c = readFileSync(sc, "utf8");
        const checks = (c.match(/✅/g) || []).length;
        if (c.length < 800 || checks < 5)
          v18Bad.push(`${d}${sub ? "/" + sub : ""}/SELF-CHECK.md: 自检仅 ${c.length} 字节/${checks} 条核对——缺逐条核对记录（自检摆拍）`);
      }
    }
  }
  if (v18Bad.length) fail("review-fsaa-selfcheck", v18Bad.join(" | "));
  else ok("review-fsaa-selfcheck", "FSAA 用户取消分支捕获 + round2 起自检含逐条核对（非评分-only 摆拍）");
}

/* ---------- V15 术语表载体 + 弹层 a11y 特征（specs/content「单一事实来源」+ review 弹层基线，可执行化） ---------- */
{
  const v15Bad = [];
  // (a) terms.json 存在且 JSON 可解析；以禁用词驱动 content 域 HTML 全文扫描（剥术语表/脚本/样式）
  const cDirs = [join(regDir, "content"), join(regDir, "content", "content-critic-round2")].filter(existsSync);
  let termsJson = null;
  for (const d of cDirs) {
    const tf = join(d, "terms.json");
    if (existsSync(tf)) { try { termsJson = JSON.parse(readFileSync(tf, "utf8")); } catch (e) { v15Bad.push(`terms.json 解析失败: ${e.message}`); } }
  }
  if (cDirs.length && !termsJson) {
    v15Bad.push("content 域无 terms.json——术语表「与 Token 一样是单一事实来源」无载体（仅 HTML 表格不可执行）");
  } else if (termsJson) {
        // 场景禁用词全文扫描；「确认动作」的 确定/OK/好的 只查按钮元素文本（说明性文字/规则描述合法出现）
    const textBans = (termsJson.terms || []).filter((t) => t.concept !== "确认动作").flatMap((t) => t.ban || []);
    const btnBans = ((termsJson.terms || []).find((t) => t.concept === "确认动作") || {}).ban || [];
    for (const d of cDirs) {
      for (const f of readdirSync(d).filter((x) => x.endsWith(".html"))) {
        const s = readFileSync(join(d, f), "utf8");
        const body = s.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "")
          .replace(/<table class="term"[\s\S]*?<\/table>/g, "").replace(/<!--[\s\S]*?-->/g, "");
        for (const w of textBans) if (body.includes(w)) v15Bad.push(`${d.split("/").pop()}/${f}: 文案含术语禁用词「${w}」（terms.json）`);
        for (const m of body.matchAll(/<(button|span)[^>]*>([\s\S]*?)<\/\1>/g)) {
          const txt = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, "").trim();
          if (btnBans.includes(txt)) v15Bad.push(`${d.split("/").pop()}/${f}: 按钮文案「${txt}」（terms.json 确认动作禁用）`);
        }
      }
    }
  }
  // (b) 审阅弹层 a11y 特征（只约束 critic-round2 起；历史 round1 冻结不溯及）
  for (const d of cDirs.filter((x) => x.includes("critic-round2"))) {
    for (const f of readdirSync(d).filter((x) => x.endsWith(".html"))) {
      const s = readFileSync(join(d, f), "utf8");
      const script = (s.match(/<script>[\s\S]*?<\/script>/g) || []).join("");
      if (s.includes('class="modal"')) {
        if (!/role="dialog"[^>]*aria-modal="true"|aria-modal="true"[^>]*role="dialog"/.test(s)) v15Bad.push(`${d.split("/").pop()}/${f}: 审阅弹层缺 aria-modal="true"`);
        if (!script.includes("closeModal")) v15Bad.push(`${d.split("/").pop()}/${f}: 弹层缺统一 closeModal`);
        if (!/key\s*!==?\s*['"]Tab['"]|key\s*===?\s*['"]Tab['"]/.test(script)) v15Bad.push(`${d.split("/").pop()}/${f}: 弹层缺 Tab 困笼`);
        if (!/\.focus\(\)/.test(script)) v15Bad.push(`${d.split("/").pop()}/${f}: 弹层打开后未移动焦点`);
      }
    }
  }
  if (!cDirs.length) ok("term-modal", "无 content 回归产物，跳过术语载体");
  else if (v15Bad.length) fail("term-modal", v15Bad.join(" | "));
  else ok("term-modal", `terms.json 载体驱动禁词扫描（${(termsJson?.terms || []).length} 条术语）+ round2 弹层 a11y 特征齐全`);
}

/* ---------- V13 研究摘要结构（specs/research 验收可执行化） ---------- */
// design/regression/research/*.md：6 部分标题齐、模式表 ≥5 行含场景列、moodboard 6 维、建议含依据标注
const resBad = [];
{
  const rDir = join(regDir, "research");
  if (existsSync(rDir)) {
    for (const f of readdirSync(rDir).filter((x) => x.endsWith(".md") && x !== "SELF-CHECK.md")) {
      const c = readFileSync(join(rDir, f), "utf8");
      for (const sec of ["问题定义", "竞品洞察", "模式清单", "用户场景", "风格方向", "设计建议"]) {
        if (!c.includes(sec)) resBad.push(`${f}: 缺摘要部分「${sec}」`);
      }
      // 模式表行数：形如 | N | 模式 | 的行
      const patRows = [...c.matchAll(/^\|\s*\d+\s*\|/gm)].length;
      if (patRows < 5) resBad.push(`${f}: 模式清单仅 ${patRows} 条（须 ≥5 且每条含适用场景）`);
      else if (!c.includes("适用场景")) resBad.push(`${f}: 模式清单缺「适用场景」标注列`);
      for (const d of ["色彩", "字体", "排版", "图标", "插画", "摄影"]) {
        if (!c.includes(d)) resBad.push(`${f}: moodboard 缺维度「${d}」`);
      }
      // 建议部分每条带依据（模式 N/场景/竞品 字样）
      const sug = c.slice(c.lastIndexOf("设计建议"));
      const items = sug.split("\n").filter((l) => /^\d+\./.test(l.trim()));
      if (items.length && items.some((l) => !/(模式\s*\d|场景|竞品|基线)/.test(l)))
        resBad.push(`${f}: 设计建议存在无依据条目（须标注模式/场景/竞品来源）`);
    }
  }
}
if (resBad.length) fail("research-summary", resBad.join(" | "));
else ok("research-summary", "研究摘要结构完整（6 部分/模式 ≥5 含场景/moodboard 6 维/建议有依据）");

/* ---------- V21 交付包边界声明与实现一致（specs/handoff「边界条件已注明」可执行化） ---------- */
{
  const v21Bad = [];
  const hdDirs = [join(regDir, "handoff", "handoff-critic-round2")].filter(existsSync);
  for (const d of hdDirs) {
    for (const f of readdirSync(d).filter((x) => x.endsWith(".html"))) {
      const s = readFileSync(join(d, f), "utf8");
      // 边界条件表声明的响应式断点须有 @media 实现锚点——交付标注写了行为而无实现，照标注还原则与实际组件不符
      for (const m of s.matchAll(/(?:<|≤|&lt;)\s*(\d{3,4})px[^<]*：[^<]*(?:独占|置于|堆叠)|@(?:min|max)-width:\s*(\d{3,4})px/g)) {
        const bp = m[1] || m[2];
        if (m[1] && !new RegExp(`@media[^{]*\\d{3,4}px`).test(s))
          v21Bad.push(`handoff/${f}: 边界表声明 <${bp}px 响应式行为但无 @media 实现——声明与实现脱节`);
      }
      // 精确配对：每个声明的断点值须出现对应 @media
      const declared = [...s.matchAll(/(?:&lt;|<)\s*(480|1280|768)px/g)].map((m) => m[1]);
      for (const bp of declared)
        if (!s.includes(`@media`) || !new RegExp(`@media[^{]*${bp}px`).test(s))
          v21Bad.push(`handoff/${f}: 边界表声明 ${bp}px 断点行为但无对应 @media——照标注还原将与实际组件不符`);
    }
  }
  if (v21Bad.length) fail("handoff-breakpoint", v21Bad.join(" | "));
  else ok("handoff-breakpoint", "边界表声明的响应式断点均有 @media 实现锚点（声明=实现）");
}

/* ---------- V20 规范定制基线一致性（specs/spec-customization「沿用=逐值一致」可执行化） ---------- */
{
  const v20Bad = [];
  const scDir = join(regDir, "spec-customization", "spec-customization-critic-round2");
  if (existsSync(scDir)) {
    const master = readFileSync(join(scDir, "MASTER.md"), "utf8");
    // (a) 基线引用路径须真实存在（相对 design/ 解析），断链=检索优先级链根基断裂
    for (const m of master.matchAll(/`([^`]*specs\/[^`]+)`/g)) {
      const rel = m[1].split("（")[0].trim();
      if (!/^(design-me\/|design\/)/.test(rel)) continue; // 仅校验显式相对 design/ 的路径，简写/通配/叙述不查
      if (!existsSync(resolve(root, "..", rel)))
        v20Bad.push(`spec-customization/MASTER.md: 基线引用断链「${rel}」（相对 design/ 不存在）`);
    }
    // (b) 「沿用基线（不覆盖）」的 Token 组须与基线逐值一致：radius 刻度 ⊆ 基线刻度；motion duration = 基线值
    const proj = JSON.parse(readFileSync(join(scDir, "tokens.json"), "utf8"));
    const base = JSON.parse(readFileSync(join(regDir, "design-system", "tokens.json"), "utf8"));
    const baseScale = base.baseline.radius.scale;
    const mNote = base.baseline.motion.note || "";
    if (master.includes("圆角与阴影（沿用基线")) {
      for (const [k, v] of Object.entries(proj.radius || {}))
        if (!baseScale.includes(v)) v20Bad.push(`spec-customization/tokens.json: radius.${k}=${v} 不在基线刻度 [${baseScale}]——声明「沿用」却值自拟（隐性覆盖）`);
    }
    if (master.includes("动效（沿用基线")) {
      for (const [k, v] of Object.entries(proj.motion || {})) {
        const ms = parseInt(v);
        if (/duration/.test(k) && mNote && !mNote.includes(String(ms)))
          v20Bad.push(`spec-customization/tokens.json: motion.${k}=${v} 与基线 note「${mNote}」不符——隐性覆盖`);
      }
    }
  }
  if (v20Bad.length) fail("custom-baseline", v20Bad.join(" | "));
  else ok("custom-baseline", "基线引用路径全存在 + 「沿用」Token 与基线逐值一致（radius 刻度/motion 时长）");
}

/* ---------- V19 toapis Prompt 模型输入纯净 + 展示环境（specs/image-prompt「Prompt 即模型输入」可执行化） ---------- */
{
  const v19Bad = [];
  const ipDirs = [join(regDir, "image-prompt", "image-prompt-critic-round2")].filter(existsSync);
  for (const d of ipDirs) {
    for (const f of readdirSync(d).filter((x) => x.endsWith("_prompt.md"))) {
      const c = readFileSync(join(d, f), "utf8");
      // (a) 元信息混入模型输入：流程/回归说明（「不实际调用」「回归」「自测注记」）不得出现在 Prompt 正文
      if (/不实际调用|回归产物|回归注记|仅供审阅/.test(c))
        v19Bad.push(`image-prompt/${f}: 流程/回归元信息混入 Prompt 正文——本文件全文即模型输入（--prompt-file），元信息须移 SELF-CHECK`);
      // (b) 展示环境声明：浅/暗色用途未声明 → 浅色底图压暗色空状态等错配风险
      if (!/展示环境|浅色模式|暗色模式|dark mode/i.test(c))
        v19Bad.push(`image-prompt/${f}: 缺展示环境声明（浅/暗色用途；spec「生成前声明展示环境」）`);
    }
  }
  if (v19Bad.length) fail("prompt-purity", v19Bad.join(" | "));
  else ok("prompt-purity", "Prompt 正文无元信息混入（--prompt-file 纯输入）+ 展示环境已声明");
}

/* ---------- V16 研究三层真实覆盖 + 关键词锚定（specs/research R2「间接竞品 1 个」+ R6 关键词可操作化） ---------- */
{
  const v16Bad = [];
  // 只约束 critic-round2 起（历史 round1 冻结不溯及）
  const rDirs = [join(regDir, "research", "research-critic-round2")].filter(existsSync);
  for (const d of rDirs) {
    for (const f of readdirSync(d).filter((x) => x.endsWith(".md") && x !== "SELF-CHECK.md")) {
      const c = readFileSync(join(d, f), "utf8");
      // (a) 三层须各有真实落点：竞品表须含「间接」层级行——「兼任」不能让某一层整个缺席
      const rows = [...c.matchAll(/^\|\s*([^|\n]+)\s*\|\s*([^|\n]*直接[^|\n]*|[^|\n]*间接[^|\n]*|[^|\n]*标杆[^|\n]*)\s*\|/gm)];
      const layers = rows.map((r) => r[2]);
      for (const l of ["间接"]) if (!layers.some((x) => x.includes(l))) v16Bad.push(`${d.split("/").pop()}/${f}: 竞品表无「${l}」层级落点（R2 三层须真实覆盖，兼任不得使层缺席）`);
      // (b) 风格关键词须带操作性解释（关键词行/表含解释列），裸词列不可操作
      const kw = c.match(/风格关键词[^\n]*：([^\n]*)/);
      if (kw && !c.includes("操作性解释") && !/（[^）]{6,}）/.test(kw[1])) v16Bad.push(`${f}: 风格关键词裸词无解释（R6 须可操作化，供 Phase 1 引用）`);
      // (c) 研究元信息：方法/日期/断言可核性注记
      if (!c.includes("研究元信息")) v16Bad.push(`${f}: 缺研究元信息注记（方法/日期/事实断言可核性，R7 可复现性）`);
    }
  }
  if (v16Bad.length) fail("research-layers", v16Bad.join(" | "));
  else ok("research-layers", "round2 起竞品三层真实落点（含间接）+ 关键词带解释 + 研究元信息注记");
}

/* ---------- V14 交付包完整性（specs/handoff 走查可执行化） ---------- */
// design/regression/handoff/：tokens.json 六组键齐且合法 JSON；标注层无裸 hex；assets SVG 命名前缀 + currentColor
const handBad = [];
{
  const hDir = join(regDir, "handoff");
  if (existsSync(hDir)) {
    const tokPath = join(hDir, "tokens.json");
    if (existsSync(tokPath)) {
      try {
        const tok = JSON.parse(readFileSync(tokPath, "utf8"));
        for (const k of ["color", "font", "space", "radius", "shadow", "motion"]) {
          if (!tok[k] || !Object.keys(tok[k]).length) handBad.push(`tokens.json: 缺 Token 组「${k}」`);
        }
      } catch (e) { handBad.push(`tokens.json: 非法 JSON（${e.message}）`); }
    }
    for (const f of readdirSync(hDir).filter((x) => x.endsWith(".html"))) {
      const s = readFileSync(join(hDir, f), "utf8");
      for (const m of s.matchAll(/class="pin"[^>]*>([\s\S]*?)<\/span>/g)) {
        const txt = m[1].replace(/<[^>]+>/g, "");
        const bare = txt.match(/#[0-9A-Fa-f]{6}\b/g) || [];
        if (bare.length) handBad.push(`${f}: 标注层裸 hex ${bare.join(",")}（须语义名）`);
      }
    }
    const aDir = join(hDir, "assets");
    if (existsSync(aDir)) {
      for (const f of readdirSync(aDir).filter((x) => x.endsWith(".svg"))) {
        if (!/^(ic|bg|ill)_[a-z0-9_-]+\.svg$/.test(f)) handBad.push(`assets/${f}: 命名不合 ic_/bg_/ill_ 前缀规范`);
        if (!/currentColor/.test(readFileSync(join(aDir, f), "utf8"))) handBad.push(`assets/${f}: 缺 currentColor（主题着色）`);
      }
    }
  }
}
if (handBad.length) fail("handoff-pack", handBad.join(" | "));
else ok("handoff-pack", "交付包完整（Token 六组/标注无裸 hex/资源命名+currentColor）");

/* ---------- V15 toapis Prompt 文件（specs/image-prompt 验收可执行化） ---------- */
// design/regression/image-prompt/*_prompt.md：必备节齐（可选节缺项须有说明）、负面词 ≥3、品牌 hex 绑定、toapis 命令含 --save
const prmBad = [];
{
  const pDir = join(regDir, "image-prompt");
  if (existsSync(pDir)) {
    for (const f of readdirSync(pDir).filter((x) => x.endsWith("_prompt.md"))) {
      const c = readFileSync(join(pDir, f), "utf8");
      for (const sec of ["用途", "内容画布", "主体与构图", "场景与风格", "负面词", "toapis 命令"]) {
        if (!c.includes(sec)) prmBad.push(`${f}: 缺必备节「${sec}」`);
      }
      const neg = c.slice(c.indexOf("负面词"));
      const negCount = (neg.match(/^\d+\./gm) || []).length;
      if (negCount < 3) prmBad.push(`${f}: 负面词仅 ${negCount} 条（须 ≥3 且与素材类型相关）`);
      if (!/#[0-9A-Fa-f]{6}/.test(c)) prmBad.push(`${f}: 无品牌 hex 绑定（模糊色词不可接受）`);
      if (/企业蓝|现代感|科技蓝/.test(c)) prmBad.push(`${f}: 含模糊风格/色词`);
      if (!/python3\s+scripts\/toapis\.py/.test(c) || !/--save/.test(c))
        prmBad.push(`${f}: 缺 toapis 命令或 --save 落盘参数`);
      // 品牌节存在时可选节（光线/材质/IP 特征）缺项须说明
      if (c.includes("品牌基线绑定")) {
        for (const opt of ["光线 / 材质", "IP 特征"]) {
          if (!c.includes(opt) && !c.includes("不适用") && !c.includes("缺项"))
            prmBad.push(`${f}: 可选节「${opt}」缺失且无缺项说明`);
        }
      }
    }
  }
}
if (prmBad.length) fail("image-prompt", prmBad.join(" | "));
else ok("image-prompt", "Prompt 文件结构完整（必备节/负面词 ≥3/品牌 hex 绑定/toapis 命令）");

/* ---------- V17 审阅机制骨架（specs/review 验收可执行化） ---------- */
// design/regression/*/review*.html 或 review/：弹窗居中 flexbox 骨架、FSAA 双路径、待改/阻塞校验、存储键按 ID
const revBad = [];
{
  const scan = (dir, rel) => {
    if (!existsSync(dir)) return;
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".html") && /review/i.test(x))) {
      const c = readFileSync(join(dir, f), "utf8");
      if (!/align-items:\s*center/.test(c) || !/justify-content:\s*center/.test(c) || !/position:\s*fixed/.test(c))
        revBad.push(`${rel}${f}: 弹窗遮罩缺 flexbox 双居中或 fixed 骨架`);
      if (!/showDirectoryPicker\(/.test(c)) revBad.push(`${rel}${f}: 缺 FSAA 主路径（showDirectoryPicker 调用）`);
      else if (!/indexedDB/i.test(c)) revBad.push(`${rel}${f}: FSAA 句柄未持久化（缺 IndexedDB 复用）`);
      if (!/createObjectURL/.test(c)) revBad.push(`${rel}${f}: 缺降级下载路径（Blob）`);
      if (!/待改|阻塞/.test(c) || !/role="alert"|role='alert'/.test(c))
        revBad.push(`${rel}${f}: 快捷标记校验缺失或错误提示无 role=alert`);
      if (!/localStorage/.test(c)) revBad.push(`${rel}${f}: 反馈未落 localStorage`);
      if (!/max-width:\s*(480px|100%)/.test(c)) revBad.push(`${rel}${f}: 弹窗宽度规则缺失（max-width 480/100%）`);
    }
  };
  scan(join(regDir, "review"), "review/");
}
if (revBad.length) fail("review-mech", revBad.join(" | "));
else ok("review-mech", "审阅机制骨架完整（居中/FSAA 双路径/标记校验/localStorage）");

/* ---------- V18 规范定制结构（specs/spec-customization 验收可执行化） ---------- */
// design/regression/spec-customization/：MASTER 含基线引用+覆盖三要素（字段/新值/原因）+不覆盖节；pages 仅差异；Token 与 MASTER 主色一致
const scBad = [];
{
  const sDir = join(regDir, "spec-customization");
  if (existsSync(sDir)) {
    const mPath = join(sDir, "MASTER.md");
    if (existsSync(mPath)) {
      const c = readFileSync(mPath, "utf8");
      if (!/基线引用/.test(c)) scBad.push("MASTER.md: 缺「基线引用」节（须引用全局 spec）");
      for (const s of ["brand", "web", "mobile"]) {
        if (!c.includes(`specs/${s}`)) scBad.push(`MASTER.md: 基线引用缺 specs/${s}`);
      }
      // 覆盖行（- xxx：值（覆盖…）格式）须含「原因」相邻行
      const covLines = [...c.matchAll(/^- ([^：]+)：([^（\n]+)（覆盖/gm)];
      for (const m of covLines) {
        const after = c.slice(m.index, m.index + 220);
        if (!/原因/.test(after)) scBad.push(`MASTER.md: 覆盖「${m[1].trim()}」无原因说明`);
      }
      if (!/不覆盖项/.test(c)) scBad.push("MASTER.md: 缺「不覆盖项」显式声明（漏考虑 vs 有意沿用不可区分）");
      // Token 一致性：MASTER 覆盖的主色 hex 与 tokens.json color.primary 一致
      const priHex = (c.match(/主色：(#(?:[0-9A-Fa-f]{6}))/) || [])[1];
      const tPath = join(sDir, "tokens.json");
      if (priHex && existsSync(tPath)) {
        try {
          const tok = JSON.parse(readFileSync(tPath, "utf8"));
          if (tok.color && tok.color.primary !== priHex)
            scBad.push(`Token 与 spec 脱节：MASTER 主色 ${priHex} ≠ tokens.json primary ${tok.color.primary}`);
        } catch (e) { scBad.push(`tokens.json: 非法 JSON（${e.message}）`); }
      }
    }
    // pages 覆盖仅写差异：文件须含「不覆盖项」（防复述基线），且不得大段复述 MASTER 覆盖值
    const pDir = join(sDir, "pages");
    if (existsSync(pDir)) {
      for (const f of readdirSync(pDir).filter((x) => x.endsWith(".md"))) {
        const c = readFileSync(join(pDir, f), "utf8");
        if (!/不覆盖项|沿用/.test(c)) scBad.push(`pages/${f}: 缺「不覆盖项/沿用」声明（仅差异原则）`);
      }
    }
  }
}
if (scBad.length) fail("spec-custom", scBad.join(" | "));
else ok("spec-custom", "规范定制结构完整（基线引用/覆盖三要素/不覆盖声明/Token 一致/pages 仅差异）");

/* ---------- 汇总 ---------- */
if (failed) exit(1, { ...out, checks: { huashu: 0, specs_root: 0, route: 0, structure: 0, refs: 0, self_check: 0, brand_diff: 0, icon_set: 0 } });
else { out.report.push(`\n全部通过（${specMds.length} 个 spec，8 项校验）`); exit(0, out); }