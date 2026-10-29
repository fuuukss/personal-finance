export default function ProtectedRouteLoading() {
  return <main className="page route-loading" aria-label="Učitavanje" aria-busy="true">
    <div className="loading-line loading-title" />
    <div className="loading-card" />
    <div className="loading-grid">
      <div className="loading-card loading-card-small" />
      <div className="loading-card loading-card-small" />
      <div className="loading-card loading-card-small" />
    </div>
  </main>;
}
