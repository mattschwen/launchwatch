import { ImageResponse } from 'next/og';

export const alt =
  'LaunchWatch mission control — schedule, coverage, and telemetry';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'stretch',
          background:
            'radial-gradient(circle at 13% 12%, rgba(94, 230, 168, 0.16), transparent 28%), radial-gradient(circle at 88% 18%, rgba(255, 79, 216, 0.13), transparent 30%), #05060a',
          color: '#f4f7fb',
          display: 'flex',
          fontFamily: 'Arial, sans-serif',
          height: '100%',
          padding: '46px',
          width: '100%',
        }}
      >
        <div
          style={{
            border: '1px solid rgba(88, 230, 255, 0.3)',
            borderRadius: '22px',
            boxShadow: 'inset 0 0 0 1px rgba(94, 230, 168, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden',
            padding: '42px 48px 38px',
            position: 'relative',
            width: '100%',
          }}
        >
          <div
            style={{
              background:
                'linear-gradient(90deg, #5ee6a8 0%, #58e6ff 55%, #ff4fd8 100%)',
              display: 'flex',
              height: '5px',
              left: 0,
              position: 'absolute',
              right: 0,
              top: 0,
            }}
          />

          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '34px',
                fontWeight: 700,
                letterSpacing: '-1.4px',
              }}
            >
              <span>Launch</span>
              <span style={{ color: '#5ee6a8' }}>Watch</span>
            </div>
            <div
              style={{
                alignItems: 'center',
                color: '#58e6ff',
                display: 'flex',
                fontFamily: 'monospace',
                fontSize: '17px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              <span
                style={{
                  background: '#58e6ff',
                  borderRadius: '999px',
                  display: 'flex',
                  height: '10px',
                  marginRight: '12px',
                  width: '10px',
                }}
              />
              Mission network online
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                color: '#aeb9ca',
                display: 'flex',
                fontFamily: 'monospace',
                fontSize: '18px',
                fontWeight: 700,
                letterSpacing: '3px',
                marginBottom: '22px',
                textTransform: 'uppercase',
              }}
            >
              Launch network // active console
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '70px',
                fontWeight: 700,
                letterSpacing: '-3.8px',
                lineHeight: 1.03,
                maxWidth: '900px',
              }}
            >
              Mission control for the launch ahead.
            </div>
            <div
              style={{
                color: '#bac5d5',
                display: 'flex',
                fontSize: '24px',
                lineHeight: 1.4,
                marginTop: '22px',
              }}
            >
              Upcoming missions, official coverage, and provider-backed
              telemetry in one signal.
            </div>
          </div>

          <div
            style={{
              alignItems: 'center',
              borderTop: '1px solid rgba(174, 185, 202, 0.2)',
              color: '#8d99aa',
              display: 'flex',
              fontFamily: 'monospace',
              fontSize: '16px',
              justifyContent: 'space-between',
              letterSpacing: '1.7px',
              paddingTop: '26px',
              textTransform: 'uppercase',
            }}
          >
            <span>Schedule · Coverage · Telemetry</span>
            <span style={{ color: '#5ee6a8' }}>launchwatch.io</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
