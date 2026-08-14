import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { POST } from '@/app/share-target/route';
import { getShareTargetSearch } from '@/lib/share-target';

function formData(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe('installed-app share target', () => {
  it('prefers shared mission text and removes appended links', () => {
    expect(
      getShareTargetSearch(
        formData({
          title: 'Launch article',
          text: '  Orbital Dawn\nhttps://example.test/launches/orbital-dawn  ',
          url: 'https://example.test/launches/orbital-dawn',
        }),
      ),
    ).toBe('Orbital Dawn');
  });

  it('falls back to a bounded title when shared text only contains a URL', () => {
    expect(
      getShareTargetSearch(
        formData({
          title: `Astra Nova ${'mission '.repeat(30)}`,
          text: 'https://example.test/launches/orbital-dawn',
        }),
      ),
    ).toMatch(/^Astra Nova mission/);
    expect(
      getShareTargetSearch(
        formData({
          title: `Astra Nova ${'mission '.repeat(30)}`,
          text: 'https://example.test/launches/orbital-dawn',
        }),
      ).length,
    ).toBeLessThanOrEqual(120);
  });

  it('redirects same-origin shared text into the existing schedule search', async () => {
    const body = new URLSearchParams({
      title: 'Launch article',
      text: 'Orbital Dawn https://example.test/launches/orbital-dawn',
      url: 'https://example.test/launches/orbital-dawn',
    });
    const response = await POST(
      new NextRequest('https://launchwatch.test/share-target', {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe(
      'https://launchwatch.test/?q=Orbital+Dawn',
    );
  });

  it('recovers URL-only payloads to the unfiltered schedule', async () => {
    const response = await POST(
      new NextRequest('https://launchwatch.test/share-target', {
        method: 'POST',
        body: new URLSearchParams({
          url: 'https://example.test/launches/orbital-dawn',
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe('https://launchwatch.test/');
  });

  it('recovers malformed form bodies to the unfiltered schedule', async () => {
    const response = await POST(
      new NextRequest('https://launchwatch.test/share-target', {
        method: 'POST',
        body: 'not-a-valid-multipart-body',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe('https://launchwatch.test/');
  });
});
