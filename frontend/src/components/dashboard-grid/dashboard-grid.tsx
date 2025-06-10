import React from 'react'
import styles from './dashboard-grid.module.css'

interface DashboardGridProps {
  children: React.ReactNode
  variant: 'overview' | 'simple'
}

export default function DashboardGrid({ children, variant }: DashboardGridProps) {
  const className = `${styles.dashboardGrid} ${variant === 'simple' ? styles.simpleGrid : styles.overviewGrid}`
  return <div className={className}>{children}</div>
}

interface GridItemProps {
  area: string
  children: React.ReactNode
  className?: string
}

export function GridItem({ area, children, className = '' }: GridItemProps) {
  return (
    <div style={{ gridArea: area }} className={`overflow-auto bg-card rounded p-4 ${className}`}>
      {children}
    </div>
  )
}