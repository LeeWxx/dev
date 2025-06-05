"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Header() {
  const pathname = usePathname()
  
  return (
    <header className="border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold">
              Crusia
            </Link>
            <nav className="hidden md:flex">
              <ul className="flex items-center gap-6">
                <li>
                  <Link 
                    href="/blog" 
                    className={`${
                      pathname === '/blog' || pathname.startsWith('/blog/') 
                        ? 'text-white font-medium' 
                        : 'text-gray-400 hover:text-white'
                    } transition-colors`}
                  >
                    Blog
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
} 