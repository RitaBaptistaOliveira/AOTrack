interface GridItemProps {
  area: string
  children: React.ReactNode
  className?: string
}

export function GridItem({ area, children, className = '' }: GridItemProps) {
  return (
    <div style={{ gridArea: area }} className={`bg-card rounded p-4 ${className}`}>
      {children}
    </div>
  )
}
