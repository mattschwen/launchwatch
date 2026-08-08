import { ImageResponse } from 'next/og';

export const alt =
  'LaunchWatch archive — completed missions, outcomes, and official coverage';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

const missions = [
  {
    date: 'RECOVERED 09:08 UTC',
    name: 'ORBITAL INSERTION',
    outcome: 'SUCCESS',
    color: '#5ee6a8',
  },
  {
    date: 'RECOVERED 16:42 UTC',
    name: 'PAYLOAD DEPLOYMENT',
    outcome: 'CONFIRMED',
    color: '#58e6ff',
  },
  {
    date: 'SIGNAL ARCHIVED',
    name: 'FLIGHT TELEMETRY',
    outcome: 'AVAILABLE',
    color: '#ffc45c',
  },
];

export default function HistoryOpenGraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'stretch',
          background:
            'radial-gradient(circle at 14% 15%, rgba(255, 196, 92, 0.18), transparent 30%), radial-gradient(circle at 88% 18%, rgba(255, 79, 216, 0.12), transparent 28%), #05060a',
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
            border: '1px solid rgba(255, 196, 92, 0.38)',
            borderRadius: '22px',
            boxShadow:
              'inset 0 0 0 1px rgba(88, 230, 255, 0.06), 0 24px 80px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
            width: '100%',
          }}
        >
          <div
            style={{
              background:
                'linear-gradient(90deg, #ffc45c 0%, #58e6ff 58%, #ff4fd8 100%)',
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
              borderBottom: '1px solid rgba(174, 185, 202, 0.17)',
              display: 'flex',
              justifyContent: 'space-between',
              padding: '32px 42px 28px',
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
                color: '#ffc45c',
                display: 'flex',
                fontFamily: 'monospace',
                fontSize: '16px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              <span
                style={{
                  background: '#ffc45c',
                  borderRadius: '3px',
                  display: 'flex',
                  height: '12px',
                  marginRight: '12px',
                  width: '12px',
                }}
              />
              Archive node // online
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flex: 1,
              padding: '36px 42px 38px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                paddingRight: '52px',
                width: '58%',
              }}
            >
              <div
                style={{
                  color: '#ffc45c',
                  display: 'flex',
                  fontFamily: 'monospace',
                  fontSize: '17px',
                  fontWeight: 700,
                  letterSpacing: '3px',
                  marginBottom: '20px',
                  textTransform: 'uppercase',
                }}
              >
                Recovered telemetry
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: '74px',
                  fontWeight: 700,
                  letterSpacing: '-4px',
                  lineHeight: 0.98,
                }}
              >
                Launch archive
              </div>
              <div
                style={{
                  color: '#bac5d5',
                  display: 'flex',
                  fontSize: '23px',
                  lineHeight: 1.4,
                  marginTop: '24px',
                }}
              >
                Completed missions, confirmed outcomes, and official coverage.
              </div>
            </div>

            <div
              style={{
                alignSelf: 'stretch',
                background: 'rgba(9, 14, 23, 0.8)',
                border: '1px solid rgba(88, 230, 255, 0.18)',
                borderRadius: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '22px 24px',
                width: '42%',
              }}
            >
              <div
                style={{
                  color: '#8d99aa',
                  display: 'flex',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  letterSpacing: '2px',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                }}
              >
                Flight record index
              </div>
              {missions.map((mission) => (
                <div
                  key={mission.name}
                  style={{
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(174, 185, 202, 0.14)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '16px 0',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span
                      style={{
                        color: '#8d99aa',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        letterSpacing: '1.2px',
                      }}
                    >
                      {mission.date}
                    </span>
                    <span
                      style={{
                        color: '#f4f7fb',
                        fontSize: '17px',
                        fontWeight: 700,
                        marginTop: '5px',
                      }}
                    >
                      {mission.name}
                    </span>
                  </div>
                  <span
                    style={{
                      alignItems: 'center',
                      color: mission.color,
                      display: 'flex',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      letterSpacing: '1px',
                    }}
                  >
                    <span
                      style={{
                        background: mission.color,
                        borderRadius: '999px',
                        display: 'flex',
                        height: '8px',
                        marginRight: '8px',
                        width: '8px',
                      }}
                    />
                    {mission.outcome}
                  </span>
                </div>
              ))}
              <div
                style={{
                  color: '#58e6ff',
                  display: 'flex',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  justifyContent: 'flex-end',
                  letterSpacing: '1.4px',
                  paddingTop: '17px',
                  textTransform: 'uppercase',
                }}
              >
                launchwatch.io/history
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
