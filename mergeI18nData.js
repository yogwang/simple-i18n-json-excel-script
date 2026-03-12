import fs from 'fs';
import path from 'path';

// ── CLI 参数解析 ──────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, defaultValue) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
}

const inputDir = path.resolve(getArg('--dir', './source/mergeDemo'));
const outputDir = path.resolve(getArg('--outDir', './dist/merged'));

// ── 语言码识别 ────────────────────────────────────────────────
// 支持 en, zh-CN, zh-Hant, pt-BR 等 BCP-47 子集；统一小写比对，输出保留原始写法
const LANG_CODE_RE = /^[a-z]{2,3}(-[a-zA-Z]{2,4})?$/;

const knownLangs = new Map(); // normalizedCode -> originalCode (首次写入的形式)

function normalizeLang(code) {
  return code.toLowerCase();
}

function isLangCode(name) {
  return LANG_CODE_RE.test(name);
}

function registerLang(raw) {
  const norm = normalizeLang(raw);
  if (!knownLangs.has(norm)) {
    knownLangs.set(norm, raw);
  }
  return norm;
}

function getCanonicalLang(norm) {
  return knownLangs.get(norm) || norm;
}

// ── 递归文件扫描 ──────────────────────────────────────────────
function collectJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(full);
    }
  }
  return results;
}

// ── 路径模式识别 ──────────────────────────────────────────────
// 返回 { lang, moduleParts } 或 null
function classifyFile(filePath, rootDir) {
  const rel = path.relative(rootDir, filePath);
  const parts = rel.split(path.sep);
  const fileName = parts[parts.length - 1];
  const baseName = fileName.replace(/\.json$/, '');
  const parentParts = parts.slice(0, -1);

  // 模式 A: .../moduleName/lang.json  （文件名是语言码）
  if (isLangCode(baseName) && parentParts.length > 0) {
    return {
      lang: baseName,
      moduleParts: parentParts,
      pattern: 'A',
    };
  }

  // 模式 B: .../lang/moduleName.json  （父目录名是语言码）
  if (parentParts.length > 0) {
    const lastDir = parentParts[parentParts.length - 1];
    if (isLangCode(lastDir)) {
      return {
        lang: lastDir,
        moduleParts: [...parentParts.slice(0, -1), baseName],
        pattern: 'B',
      };
    }
  }

  return null;
}

// ── 深层路径写入 + 冲突检测 ───────────────────────────────────
// registry: Map<string, string>  key = "norm_lang|mod.path"  value = source file
const conflictRegistry = new Map();

function setNestedValue(obj, keys, value, langNorm, sourceFile) {
  const pathKey = `${langNorm}|${keys.join('.')}`;
  if (conflictRegistry.has(pathKey)) {
    const prev = conflictRegistry.get(pathKey);
    console.error(
      `[CONFLICT] lang="${getCanonicalLang(langNorm)}" module="${keys.join('/')}" ` +
      `already registered by "${prev}", but "${sourceFile}" also maps here.`
    );
    process.exit(1);
  }
  conflictRegistry.set(pathKey, sourceFile);

  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] === undefined) {
      cur[keys[i]] = {};
    } else if (typeof cur[keys[i]] !== 'object' || cur[keys[i]] === null) {
      console.error(
        `[ERROR] Cannot nest under key "${keys.slice(0, i + 1).join('.')}" ` +
        `(existing value is not an object) while processing "${sourceFile}".`
      );
      process.exit(1);
    }
    cur = cur[keys[i]];
  }
  const lastKey = keys[keys.length - 1];
  if (cur[lastKey] !== undefined) {
    console.error(
      `[CONFLICT] lang="${getCanonicalLang(langNorm)}" key="${keys.join('.')}" ` +
      `already has a value, conflict from "${sourceFile}".`
    );
    process.exit(1);
  }
  cur[lastKey] = value;
}

// ── 主流程 ───────────────────────────────────────────────────
function main() {
  if (!fs.existsSync(inputDir)) {
    console.error(`[ERROR] Input directory does not exist: ${inputDir}`);
    process.exit(1);
  }

  const jsonFiles = collectJsonFiles(inputDir);
  if (jsonFiles.length === 0) {
    console.error(`[ERROR] No .json files found under: ${inputDir}`);
    process.exit(1);
  }

  const merged = {};  // { normalizedLang: nestedObject }
  let matchedCount = 0;
  const skipped = [];

  for (const filePath of jsonFiles) {
    const info = classifyFile(filePath, inputDir);
    if (!info) {
      skipped.push(filePath);
      continue;
    }

    // 解析 JSON
    let content;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      content = JSON.parse(raw);
    } catch (err) {
      console.error(`[ERROR] Failed to parse JSON: ${filePath}\n  ${err.message}`);
      process.exit(1);
    }

    if (typeof content !== 'object' || content === null || Array.isArray(content)) {
      console.error(`[ERROR] Top-level value must be a plain object: ${filePath}`);
      process.exit(1);
    }

    const langNorm = registerLang(info.lang);
    if (!merged[langNorm]) {
      merged[langNorm] = {};
    }

    const relForLog = path.relative(inputDir, filePath);
    setNestedValue(merged[langNorm], info.moduleParts, content, langNorm, relForLog);
    matchedCount++;
  }

  if (matchedCount === 0) {
    console.error('[ERROR] No files matched either pattern A or B.');
    if (skipped.length > 0) {
      console.error('Skipped files:');
      skipped.forEach(f => console.error(`  ${path.relative(inputDir, f)}`));
    }
    process.exit(1);
  }

  // 写入输出
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const langs = Object.keys(merged);
  for (const langNorm of langs) {
    const canonical = getCanonicalLang(langNorm);
    const outPath = path.join(outputDir, `${canonical}.json`);
    fs.writeFileSync(outPath, JSON.stringify(merged[langNorm], null, 2), 'utf-8');
    console.log(`[OK] ${outPath}`);
  }

  // 统计
  console.log('\n── Summary ──');
  console.log(`  Scanned files : ${jsonFiles.length}`);
  console.log(`  Matched       : ${matchedCount}`);
  console.log(`  Skipped       : ${skipped.length}`);
  console.log(`  Languages     : ${langs.map(n => getCanonicalLang(n)).join(', ')}`);
  console.log(`  Output dir    : ${outputDir}`);

  if (skipped.length > 0) {
    console.log('\n  Skipped files (no pattern match):');
    skipped.forEach(f => console.log(`    ${path.relative(inputDir, f)}`));
  }
}

main();
