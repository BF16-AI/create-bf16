#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTemplateFiles, TEMPLATES } from '../src/templates.mjs';

export function parseCreateArgs(argv) {
  let targetDir = null;
  let template = 'ai-sdk';
  let force = false;
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '-h' || token === '--help') {
      help = true;
    } else if (token === '--force' || token === '-f') {
      force = true;
    } else if (token === '--template' || token === '-t') {
      template = argv[++i] || 'ai-sdk';
    } else if (token.startsWith('--template=')) {
      template = token.slice('--template='.length);
    } else if (!token.startsWith('-') && !targetDir) {
      targetDir = token;
    }
  }

  return { targetDir: targetDir || 'my-bf16-app', template, force, help };
}

export function scaffoldProject({ targetDir, template = 'ai-sdk', force = false, cwd = process.cwd() }) {
  if (!TEMPLATES.includes(template)) {
    throw new Error(
      `Unknown template "${template}". Available templates: ${TEMPLATES.join(', ')}`
    );
  }
  const destDir = path.resolve(cwd, targetDir);
  if (fs.existsSync(destDir)) {
    const entries = fs.readdirSync(destDir);
    if (entries.length > 0 && !force) {
      throw new Error(
        `Directory "${targetDir}" is not empty. Choose another name or pass --force.`
      );
    }
  }

  const projectName = path.basename(destDir);
  const files = buildTemplateFiles({ projectName, template });
  fs.mkdirSync(destDir, { recursive: true });

  const written = [];
  for (const [relPath, content] of Object.entries(files)) {
    const absPath = path.join(destDir, relPath);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, content, 'utf8');
    written.push(relPath);
  }

  return { destDir, projectName, template, written };
}

function printHelp() {
  console.log(`
create-bf16 — Scaffold a starter app wired to bf16.ai (1M-context uncensored LLM API)

Usage:
  npm create bf16 [project-dir] [--template=ai-sdk|node|nextjs] [--force]

Templates:
  ai-sdk   TypeScript + Vercel AI SDK v6 + bf16-ai-sdk-provider (default)
  node     Zero-dependency Node.js starter using native fetch + /v1/me
  nextjs   Next.js App Router streaming chat starter + bf16-ai-sdk-provider

Examples:
  npm create bf16 my-agent
  npm create bf16 my-web-app -- --template=nextjs
  npx create-bf16 quick-script --template=node
`);
}

function main() {
  const opts = parseCreateArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const res = scaffoldProject(opts);
  console.log(`\n✓ Created ${res.projectName} (${res.template}) in ${res.destDir}`);
  console.log(`  Files: ${res.written.join(', ')}\n`);
  console.log('Next steps:');
  console.log(`  cd ${opts.targetDir}`);
  if (res.template === 'nextjs') {
    console.log('  cp .env.example .env.local');
    console.log('  npm install && npm run dev');
  } else if (res.template === 'node') {
    console.log('  cp .env.example .env');
    console.log('  npm start');
  } else {
    console.log('  cp .env.example .env');
    console.log('  npm install && npm run dev');
  }
  console.log('\nGet an API key ($0.20 starter credit): https://bf16.ai/dashboard/keys');
  console.log('Or run coding agents right now: npx bf16ai claude\n');
}

function isDirectExecution() {
  if (!process.argv[1]) return false;
  try {
    return (
      fs.realpathSync(process.argv[1]) ===
      fs.realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  try {
    main();
  } catch (err) {
    console.error(`Error: ${err?.message || err}`);
    process.exit(1);
  }
}
