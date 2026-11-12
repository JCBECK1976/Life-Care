// The loading screen. index.html shows the same markup (class "boot") before any
// JavaScript runs, so there is no flash when React takes over.
export default function LoadingScreen() {
  return (
    <div className="boot">
      <img src={import.meta.env.BASE_URL + "brand/app-logo-640.webp"} alt="Lifecare Companion" width="220" height="220" />
      <p>Loading Lifecare Companion™…</p>
    </div>
  );
}
