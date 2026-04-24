import React, { useState } from 'react'
import { Sidebar, Header } from './Sidebar'

export function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuToggle={() => setCollapsed(p => !p)} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
