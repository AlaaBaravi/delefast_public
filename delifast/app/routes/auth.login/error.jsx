import { useRouteError, isRouteErrorResponse } from "react-router";

export default function AuthLoginError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Auth Error</h2>
        <p>
          {error.status} {error.statusText}
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Auth Error</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {error?.message ? error.message : String(error)}
      </pre>
    </div>
  );
}
