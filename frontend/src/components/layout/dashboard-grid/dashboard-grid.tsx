import React from 'react'
import type {ReactNode, ReactElement} from 'react'
import styles from './dashboard-grid.module.css'

/** Props for the {@link DashboardGrid} component. */
interface DashboardGridProps {
  /** Children elements to be rendered inside the grid. */
  children: ReactNode

  /** Variant of the grid layout. Determines the CSS grid styles applied. */
  variant: 'overview' | 'simple' | 'default'
}


/** 
 * Renders a grid layout for dashboard components with different styles based on the variant.
 * 
 * @param props The props for configuring the grid defined in {@link DashboardGridProps}.
 * 
 * @category Component
*/
export default function DashboardGrid({ children, variant }: DashboardGridProps): ReactElement {
  const className = ` gap-2 ${styles.dashboardGrid} ${variant === 'simple' ? styles.simpleGrid
      : variant === 'overview' ? styles.overviewGrid
        : styles.defaultGrid
    }`
  return <div className={className}>{children}</div>
}


/** Props for the {@link GridItem} component. Represents a single grid item in the dashboard layout. */
interface GridItemProps {
  /** CSS grid area name for the item. Defines where the item will be placed in the grid. */
  area: string

  /** Children elements to be rendered inside the grid item. */
  children: React.ReactNode

  /** Optional additional CSS class names for styling the grid item. */
  className?: string
}

/** Renders a single grid item with specified area and children.
 * 
 * @param props The props for configuring the item defined in {@link GridItem}.
 * 
 * @category Component
*/
export function GridItem({ area, children, className = '' }: GridItemProps): ReactElement {
  return (
    <div style={{ gridArea: area }} className={`overflow-auto bg-card rounded-lg px-2 py-2 ${className}`}>
      {children}
    </div>
  )
}