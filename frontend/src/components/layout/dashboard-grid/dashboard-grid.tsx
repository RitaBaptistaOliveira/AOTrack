import React from 'react'
import styles from './dashboard-grid.module.css'

interface DashboardGridProps {
  children: React.ReactNode
  variant: 'overview' | 'simple' | 'default'
}

export default function DashboardGrid({ children, variant }: DashboardGridProps) {
  const className = ` gap-2 ${styles.dashboardGrid} ${variant === 'simple' ? styles.simpleGrid
      : variant === 'overview' ? styles.overviewGrid
        : styles.defaultGrid
    }`
  return <div className={className}>{children}</div>
}

interface GridItemProps {
  area: string
  children: React.ReactNode
  className?: string
}

export function GridItem({ area, children, className = '' }: GridItemProps) {
  return (
    <div style={{ gridArea: area }} className={`overflow-auto bg-card rounded-lg px-2 py-2 ${className}`}>
      {children}
    </div>
  )
}