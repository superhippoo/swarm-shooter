import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test, type Page } from '@playwright/test';

const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}-${randomUUID().slice(0, 8)}`;

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'artifact';
}

export function testArtifactPath(name: string): string {
  const info = test.info();
  const fileName = info.file.split(/[\\/]/).pop() ?? 'e2e';
  const testName = safeName(`${info.testId.slice(0, 12)}-${fileName}-${info.titlePath.join('-')}`);
  return join('artifacts', 'e2e', runId, `retry-${info.retry}`, testName, safeName(name));
}

export async function writeTestArtifact(name: string, contents: string): Promise<string> {
  const path = testArtifactPath(name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
  await test.info().attach(name, { path, contentType: name.endsWith('.json') ? 'application/json' : 'text/plain' });
  return path;
}

export async function writeJsonArtifact(name: string, value: unknown): Promise<string> {
  return writeTestArtifact(name, JSON.stringify(value, null, 2));
}

export async function capturePage(page: Page, name: string): Promise<string> {
  const path = testArtifactPath(name);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
  await test.info().attach(name, { path, contentType: 'image/png' });
  return path;
}
