import React from "react";
import { hasClientConfig } from "../firebase";

// Simple guard component that detects missing Firebase config and
// shows actionable setup instructions instead of a blank/"Loading..." UI.
export default function EnvGate({ children }) {
  const ok = hasClientConfig();
  if (ok) return children;

  const collectionName = import.meta.env.VITE_FIRESTORE_COLLECTION || "sneakers";

  return (
    <div style={{
      maxWidth: 800,
      margin: "3rem auto",
      padding: "1.5rem",
      border: "1px solid #ddd",
      borderRadius: 12,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, sans-serif",
      lineHeight: 1.5
    }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Configuration required</h1>
      <p>The Firebase client configuration is missing or invalid, so the app can't connect to Firestore.</p>
      <p style={{ marginTop: 8 }}>
        Set the environment variable <code>VITE_FIREBASE_CONFIG_JSON</code> to your Firebase web client config as a single-line JSON string.
      </p>

      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>PowerShell quick-setup</summary>
        <pre style={{ background: "#f6f8fa", padding: 12, overflow: "auto", borderRadius: 8 }}>
{`# Save your Firebase client config JSON to a file (download from Firebase console)
# e.g. C:\\secrets\\firebase-client-config.json
$env:VITE_FIREBASE_CONFIG_JSON = Get-Content 'C:\\path\\to\\firebase-client-config.json' -Raw
$env:VITE_FIRESTORE_COLLECTION = '${collectionName}'

# Start the dev server from the project folder
npm run dev`}
        </pre>
      </details>

      <p style={{ marginTop: 16 }}>
        Tip: The JSON must be a single line. Using <code>Get-Content -Raw</code> ensures that.
      </p>

      <p style={{ marginTop: 24, color: "#666" }}>
        After setting the variables, refresh this page. If you still see this message, double-check that the JSON parses and contains keys like
        <code> apiKey</code>, <code> authDomain</code>, and <code> projectId</code>.
      </p>
    </div>
  );
}
