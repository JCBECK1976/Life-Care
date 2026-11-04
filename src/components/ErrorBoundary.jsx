import React from "react";

// Dev/test only: lets the Playwright tests make one section crash on purpose
// (window.__lcCrash = "Body"). import.meta.env.DEV is false in builds, so this is removed.
function DevCrash({ name }) {
  if (window.__lcCrash === name) throw new Error("Test crash in " + name);
  return null;
}

// Wraps each section and overlay: if it crashes, show a friendly message instead of a
// blank screen, and log the error to the console. The rest of the app keeps working.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Lifecare Companion: error in " + (this.props.name || "a section"), error, info && info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ margin: "12px 0", padding: 14, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#991b1b", fontSize: 13, fontWeight: 600, lineHeight: 1.5, textAlign: "center" }}>
          Something went wrong in this section — your data is safe. Reload to try again.
        </div>
      );
    }
    return (
      <>
        {import.meta.env.DEV && <DevCrash name={this.props.name} />}
        {this.props.children}
      </>
    );
  }
}
