# LaunchWatch Brand Assets

The fused `LW` monogram is the source of truth for LaunchWatch. Its white
launch rail and green-to-cyan watch signal stay legible at favicon, app-icon,
and notification sizes without relying on a generic rocket silhouette.

- `logo_launchwatch_tracked-ascent_20260726_color.svg`: primary icon-only mark
- `logo_launchwatch_horizontal_20260726_dark.svg`: horizontal lockup
- `icon_launchwatch_app-icon_20260726_dark.svg`: full-bleed app-icon source
- `icon_launchwatch_maskable_20260810_dark.svg`: opaque adaptive-icon source;
  the monogram stays inside the platform-safe central circle
- `icon_launchwatch_notification-badge_20260726_mono.svg`: monochrome badge source

Use the mark at 24 px or larger, preserve its aspect ratio and clear space, and
do not add shadows, glows, or alternate colors. The application header pairs
the primary monogram with a quiet live-text wordmark and operational context;
the stable root PNG and favicon exports are derived from these source files for
platform use. Keep the standard and maskable app icons
separate: the standard export preserves its rounded silhouette, while the
maskable export supplies an opaque field for platform-controlled cropping.
