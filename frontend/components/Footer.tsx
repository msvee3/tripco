export function Footer() {
  return (
    <footer className="border-t bg-white py-6 mt-auto">
      <div className="mx-auto max-w-7xl px-4 flex flex-col items-center gap-1 text-center text-sm text-gray-500">
        <p className="font-medium text-gray-700">Tripco</p>
        <p>
          Designed &amp; Developed by{" "}
          <span className="font-semibold text-brand-600">oodhwe</span>
        </p>
        <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} Tripco. All rights reserved.</p>
      </div>
    </footer>
  );
}
