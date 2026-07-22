export default function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert" style={{
      padding: 24,
      maxWidth: 500,
      margin: "40px auto",
      background: "#FFEBEE",
      border: "1px solid #FFCDD2",
      borderRadius: 8,
      textAlign: "center",
    }}>
      <h2 style={{ color: "#B71C1C", fontSize: 16, marginBottom: 12 }}>
        ⚠ Something went wrong
      </h2>
      <pre style={{
        background: "#fff",
        padding: 12,
        borderRadius: 4,
        fontSize: 12,
        color: "#333",
        overflow: "auto",
        textAlign: "left",
      }}>
        {error.message}
      </pre>
      <button
        onClick={resetErrorBoundary}
        style={{
          marginTop: 16,
          padding: "8px 16px",
          background: "#0A3D2B",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        Try Again
      </button>
    </div>
  );
}
