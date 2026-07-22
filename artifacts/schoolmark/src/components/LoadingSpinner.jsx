export default function LoadingSpinner({ fullScreen = true }) {
  return (
    <div
      className={fullScreen ? 'spinner-fullscreen' : 'spinner-inline'}
      role="status"
      aria-live="polite"
      aria-label="Loading"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: fullScreen ? '100vh' : 'auto',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        className="spinner"
        style={{
          width: 32,
          height: 32,
          border: '3px solid #D0E8DC',
          borderTopColor: '#0A3D2B',
          borderRadius: '50%',
          animation: 'spin .7s linear infinite',
        }}
      />
      <span style={{ fontSize: 12, color: 'var(--mut)' }}>Loading…</span>
    </div>
  );
}
