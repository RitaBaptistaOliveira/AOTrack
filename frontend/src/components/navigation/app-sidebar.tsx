import { NavMain } from "@/components/navigation/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar
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
 * - `SidebarHeader` contains logo and title.
 * - `SidebarContent` includes the main navigation menu {@link NavMain}.
 *
 * @category Component
 */
export function AppSidebar(): ReactElement {
  const { open } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={`p-2 flex justify-start`} >
        <div className="flex items-center">
          <img
            src="/logo.svg"
            alt="AOTrack Logo"
            className="flex-shrink-0 h-auto w-8"
          />
          {open && (
            <span className="ml-3 text-lg font-semibold ">
              AOTrack
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
    </Sidebar>
  )
}
