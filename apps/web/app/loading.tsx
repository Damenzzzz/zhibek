export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Загрузка страницы"
      className="site-container flex-1 pb-20 pt-32"
    >
      <div className="skeleton h-4 w-28 rounded-full" />
      <div className="skeleton mt-7 h-14 w-3/4 max-w-xl rounded-2xl" />
      <div className="skeleton mt-6 h-4 w-2/3 max-w-md rounded-full" />
      <div className="mt-14 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
