import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

interface WebManifest {
  id: string;
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  icons: ManifestIcon[];
  shortcuts: Array<{ url: string; icons?: ManifestIcon[] }>;
}

function publicPath(pathname: string): string {
  return resolve(process.cwd(), 'public', pathname.replace(/^\//, ''));
}

function readPngDimensions(pathname: string): {
  width: number;
  height: number;
} {
  const image = readFileSync(pathname);
  expect(image.subarray(1, 4).toString('ascii')).toBe('PNG');
  return {
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20),
  };
}

describe('PWA install assets', () => {
  it('provides an installable, app-scoped web manifest', () => {
    const manifest = JSON.parse(
      readFileSync(publicPath('/manifest.json'), 'utf8')
    ) as WebManifest;

    expect(manifest).toMatchObject({
      id: '/',
      short_name: 'LaunchWatch',
      start_url: '/',
      scope: '/',
      display: 'standalone',
    });
    expect(manifest.name).toContain('LaunchWatch');
    expect(manifest.shortcuts.map((shortcut) => shortcut.url)).toEqual([
      '/',
      '/watch',
      '/history',
    ]);
  });

  it.each([
    ['/icon-192.png', 192],
    ['/icon-512.png', 512],
    ['/apple-touch-icon.png', 180],
    ['/badge-96.png', 96],
  ])('ships %s at its declared dimensions', (src, size) => {
    const pathname = publicPath(src);

    expect(existsSync(pathname)).toBe(true);
    expect(readPngDimensions(pathname)).toEqual({
      width: size,
      height: size,
    });
  });

  it('keeps manifest icon declarations aligned with real PNG files', () => {
    const manifest = JSON.parse(
      readFileSync(publicPath('/manifest.json'), 'utf8')
    ) as WebManifest;

    expect(manifest.icons).toHaveLength(2);
    for (const icon of manifest.icons) {
      expect(icon.type).toBe('image/png');
      expect(icon.purpose).toBe('any');
      expect(existsSync(publicPath(icon.src))).toBe(true);
      const declaredSize = Number(icon.sizes.split('x')[0]);
      expect(readPngDimensions(publicPath(icon.src))).toEqual({
        width: declaredSize,
        height: declaredSize,
      });
    }
  });

  it('ships one effect-free monogram and a branded favicon', () => {
    const mark = readFileSync(
      publicPath('/brand/logo_launchwatch_tracked-ascent_20260726_color.svg'),
      'utf8'
    );
    const favicon = readFileSync(resolve(process.cwd(), 'app', 'favicon.ico'));

    expect(mark).toContain('LaunchWatch LW monogram');
    expect(mark).not.toMatch(/<(?:filter|linearGradient|radialGradient)\b/i);
    expect(mark).toContain('#58C8E8');
    expect(mark).toContain('#5EE6A8');
    expect(favicon.subarray(0, 4)).toEqual(Buffer.from([0, 0, 1, 0]));
  });

  it('ships a standalone offline document without external dependencies', () => {
    const offline = readFileSync(publicPath('/offline.html'), 'utf8');

    expect(offline).toMatch(/<!doctype html>/i);
    expect(offline).toContain('LaunchWatch');
    expect(offline).toContain('href="/"');
    expect(offline).toContain('viewport-fit=cover');
    expect(offline).toContain('env(safe-area-inset-top, 0px)');
    expect(offline).toContain('env(safe-area-inset-right, 0px)');
    expect(offline).toContain('env(safe-area-inset-bottom, 0px)');
    expect(offline).toContain('env(safe-area-inset-left, 0px)');
    expect(offline).not.toMatch(/<script[^>]+src=/i);
    expect(offline).not.toMatch(/<link[^>]+rel=["']stylesheet/i);
  });
});
