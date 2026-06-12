'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit, Trash2, Search, Users } from 'lucide-react'
import type { Profile } from '@/lib/types'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/helpers'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'

interface Props {
  users: Profile[]
  currentUserId: string
}

export default function UserListClient({ users: initial, currentUserId }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState(initial)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    const res = await fetch(`/api/users/${deleteId}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== deleteId))
      toast({ title: 'User deleted', variant: 'success' })
    } else {
      const { error } = await res.json()
      toast({ title: 'Error', description: error, variant: 'destructive' })
    }
    setDeleteId(null)
    router.refresh()
  }

  async function toggleActive(user: Profile) {
    setTogglingId(user.id)
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, is_active: !user.is_active }),
    })
    setTogglingId(null)
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u))
      )
    } else {
      toast({ title: 'Error updating user', variant: 'destructive' })
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:ring-2 focus:ring-indigo-500 sm:w-36"
        >
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No users found"
          description="Create a user to get started."
          action={<Link href="/users/new"><Button size="sm">New User</Button></Link>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Joined</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Active</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.full_name} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {u.full_name}
                            {u.id === currentUserId && (
                              <span className="ml-2 text-xs text-indigo-600 font-normal">(you)</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={u.role === 'admin' ? 'admin' : 'user'}>{u.role}</Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-600 hidden sm:table-cell">
                      {u.phone_number || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs hidden md:table-cell">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch
                        checked={u.is_active}
                        onCheckedChange={() => toggleActive(u)}
                        disabled={togglingId === u.id || u.id === currentUserId}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/users/${u.id}/edit`}>
                          <Button variant="ghost" size="icon-sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        {u.id !== currentUserId && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteId(u.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete user"
        description="Are you sure you want to delete this user? All their data will be permanently removed."
        confirmLabel="Delete user"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  )
}
