import { NavLink } from "react-router-dom"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, } from "@/components/ui/sidebar"
import { routes } from "@/routes"
import type { ReactElement } from "react"

/**
 * Renders the main navigation menu for the dashboard sidebar.
 *
 * ```tsx
 * <NavMain />
 * ```
 *
 * @category Component
 */
export function NavMain(): ReactElement {
  return (
    <SidebarMenu>
      {routes.filter(route => route.navVisible).map((route) => (
        <SidebarMenuItem key={route.title} className="p-2">
          <NavLink to={`/dashboard/${route.path}`} end>
            {({ isActive }) => (
              <SidebarMenuButton asChild isActive={isActive}>
                <div>
                  <route.icon />
                  <span>{route.title}</span>
                </div>

              </SidebarMenuButton>
            )}
          </NavLink>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
