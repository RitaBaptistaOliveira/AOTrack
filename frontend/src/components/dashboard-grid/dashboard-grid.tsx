import React from 'react'
import styles from './dashboard-grid.module.css'

interface DashboardGridProps {
  children: React.ReactNode
  variant: 'overview' | 'simple'
}

export default function DashboardGrid({ children, variant }: DashboardGridProps) {
  const className =
    variant === 'simple' ? `${styles.dashboardGrid} ${styles.simpleGrid}` : `${styles.dashboardGrid} ${styles.overviewGrid}`

  return <div className={className}>{children}</div>
}
