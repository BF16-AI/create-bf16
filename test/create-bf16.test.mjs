import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseCreateArgs, scaffoldProject } from '../bin/create-bf16.mjs';
import { TEMPLATES } from '../src/templates.mjs';

test('parseCreateArgs handles positional dir and --template flags', () => {
  const a = parseCreateArgs(['demo-app', '--template=nextjs', '--force']);
  assert.equal(a.targetDir, 'demo-app');
  assert.equal(a.template, 'nextjs');
  assert.equal(a.force, true);
});

test('scaffoldProject creates valid files for every template and guards non-empty dirs', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'create-bf16-test-'));
  try {
    for (const tpl of TEMPLATES) {
      const dirName = `app-${tpl}`;
      const res = scaffoldProject({ targetDir: dirName, template: tpl, cwd: tmpRoot });
      assert.equal(res.template, tpl);
      const pkg = JSON.parse(
        fs.readFileSync(path.join(res.destDir, 'package.json'), 'utf8')
      );
      assert.equal(pkg.name, dirName);
      assert.equal(fs.existsSync(path.join(res.destDir, '.env.example')), true);
      assert.equal(fs.existsSync(path.join(res.destDir, 'README.md')), true);
    }

    assert.throws(
      () => scaffoldProject({ targetDir: 'app-node', template: 'node', cwd: tmpRoot }),
      /not empty/
    );
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
