export function Footer() {
  return (
    <footer className="border-t border-gray-800 py-8 mt-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-end items-center">
          <div className="text-gray-400 text-sm">
            © {new Date().getFullYear()} LeeWxx. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
} 