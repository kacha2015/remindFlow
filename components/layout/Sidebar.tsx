'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell, LayoutDashboard, Users, LogOut, User, X, Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/types'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/reminders', label: 'Reminders', icon: <Bell className="h-4 w-4" /> },
  { href: '/users', label: 'Users', icon: <Users className="h-4 w-4" />, adminOnly: true },
  { href: '/profile', label: 'My Profile', icon: <User className="h-4 w-4" /> },
]

interface SidebarProps {
  profile: Profile
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ profile, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly && profile.role !== 'admin') return false
    return true
  })

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 group-hover:bg-indigo-700 transition-colors">
            <Bell className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">RemindFlow</span>
        </Link>
        {onMobileClose && (
          <button
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600"
            onClick={onMobileClose}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onMobileClose}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive(item.href)
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <span className={isActive(item.href) ? 'text-indigo-600' : 'text-gray-400'}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar name={profile.full_name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{profile.full_name}</p>
            <Badge variant={profile.role === 'admin' ? 'admin' : 'user'} className="mt-0.5">
              {profile.role}
            </Badge>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-gray-200 bg-white z-40">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={onMobileClose}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}

interface HeaderProps {
  title?: string
  profile: Profile
  onMenuClick: () => void
}

export function Header({ title, profile, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </button>
        {title && (
          <h1 className="text-base font-semibold text-gray-900 lg:hidden">{title}</h1>
        )}
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-sm text-gray-500">{profile.email}</span>
        </div>
        <Avatar name={profile.full_name} size="sm" />
      </div>
    </header>
  )
}
