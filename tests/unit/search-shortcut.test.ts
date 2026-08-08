import { describe, expect, it } from 'vitest';
import { shouldHandleSearchShortcut } from '@/lib/search-shortcut';

function shortcutEvent(
  overrides: Partial<Parameters<typeof shouldHandleSearchShortcut>[0]> = {},
): Parameters<typeof shouldHandleSearchShortcut>[0] {
  return {
    altKey: false,
    ctrlKey: false,
    defaultPrevented: false,
    key: '/',
    metaKey: false,
    repeat: false,
    target: document.body,
    ...overrides,
  };
}

describe('mission search shortcut', () => {
  it('accepts an unmodified slash outside editable controls', () => {
    expect(shouldHandleSearchShortcut(shortcutEvent())).toBe(true);
  });

  it('does not replace typing or selection inside editable controls', () => {
    for (const target of [
      document.createElement('input'),
      document.createElement('textarea'),
      document.createElement('select'),
    ]) {
      expect(shouldHandleSearchShortcut(shortcutEvent({ target }))).toBe(false);
    }

    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    expect(shouldHandleSearchShortcut(shortcutEvent({ target: editable }))).toBe(
      false,
    );
  });

  it('ignores modified, repeated, handled, and unrelated key events', () => {
    expect(shouldHandleSearchShortcut(shortcutEvent({ ctrlKey: true }))).toBe(
      false,
    );
    expect(shouldHandleSearchShortcut(shortcutEvent({ metaKey: true }))).toBe(
      false,
    );
    expect(shouldHandleSearchShortcut(shortcutEvent({ altKey: true }))).toBe(
      false,
    );
    expect(shouldHandleSearchShortcut(shortcutEvent({ repeat: true }))).toBe(
      false,
    );
    expect(
      shouldHandleSearchShortcut(shortcutEvent({ defaultPrevented: true })),
    ).toBe(false);
    expect(shouldHandleSearchShortcut(shortcutEvent({ key: '?' }))).toBe(false);
  });
});
