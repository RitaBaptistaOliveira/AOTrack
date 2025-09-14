import { NavMain } from "@/components/navigation/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader
} from "@/components/ui/sidebar"
import type { ReactElement } from "react"

/**
 * Renders the main collapsible sidebar for the dashboard.
 *
 * ```tsx
 * <AppSidebar />
 * ```
 * 
 * Wraps the `Sidebar` component and provides a header and content area.
 * - `SidebarHeader` displays a static label ("AOT").
 * - `SidebarContent` includes the main navigation menu {@link NavMain}.
 *
 * @category Component
 */
export function AppSidebar(): ReactElement {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-2 font-semibold">
            AOT
      </SidebarHeader>
      <SidebarContent>
        <NavMain/>
      </SidebarContent>
    </Sidebar>
  )
}
