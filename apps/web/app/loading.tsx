export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Загрузка страницы"
      className="site-container flex-1 py-32"
    >
      <div className="h-4 w-28 rounded bg-canvas-2" />
      <div className="mt-7 h-12 w-3/4 max-w-xl rounded bg-canvas-2" />
      <div className="mt-6 h-4 w-2/3 max-w-md rounded bg-canvas-2" />
      <div className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-[3/4] bg-canvas-2" />
        ))}
      </div>
    </div>
  );
}
