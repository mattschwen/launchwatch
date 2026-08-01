import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const layoutPath = resolve(process.cwd(), 'app/layout.tsx');
const layoutSource = readFileSync(layoutPath, 'utf8');

describe('font delivery', () => {
  it('uses bundled WOFF2 sources instead of a network font loader', () => {
    const fontPaths = [...layoutSource.matchAll(/path: ["']([^"']+\.woff2)["']/g)].map(
      ([, path]) => path,
    );

    expect(layoutSource).toContain('from "next/font/local"');
    expect(layoutSource).not.toContain('next/font/google');
    expect(fontPaths).toHaveLength(7);
    expect(new Set(fontPaths)).toHaveLength(fontPaths.length);

    for (const fontPath of fontPaths) {
      expect(statSync(resolve(dirname(layoutPath), fontPath)).size).toBeGreaterThan(
        0,
      );
    }
  });
});
