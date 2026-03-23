export default function SectionCard({ title, children, className = '' }) {
  return (
    <div
      className={`
        animate-slide-up rounded-xl border border-gray-200 bg-white
        p-5 shadow-sm
        dark:border-gray-700 dark:bg-gray-900
        ${className}
      `}
    >
      {title && (
        <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-gray-100">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
