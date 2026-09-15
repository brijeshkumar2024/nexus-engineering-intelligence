import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('NEXUS Web App', () => {
  it('should contain NEXUS branding on the landing page', () => {
    const pagePath = resolve(process.cwd(), 'app/page.tsx');
    const pageSource = readFileSync(pagePath, 'utf-8');

    expect(pageSource).toContain('NEXUS');
  });

  it('should contain a demo entry point', () => {
    const pagePath = resolve(process.cwd(), 'app/page.tsx');
    const pageSource = readFileSync(pagePath, 'utf-8');

    expect(pageSource).toContain('/demo');
  });
});