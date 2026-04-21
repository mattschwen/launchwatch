# Livestream Notes

## Current Strategy

- use provider webcast URLs when available
- embed YouTube URLs when they can be normalized
- otherwise surface provider-channel and YouTube-search fallbacks

## Files

- `components/LiveNow.tsx`
- `components/NextLaunch.tsx`
- `components/LaunchCard.tsx`
- `lib/youtube.ts`

## Current Limitation

There is no full automated stream discovery pipeline. Fallback behavior is link-based.
