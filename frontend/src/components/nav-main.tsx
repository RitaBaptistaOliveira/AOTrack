"use client"

import {NavLink} from "react-router-dom"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { routes } from "@/routes"

export function NavMain() {
  return (
    <SidebarMenu>
      {routes.filter(route => route.navVisible).map((route) => (
        <SidebarMenuItem key={route.title}>
          <NavLink to={`/dashboard/${route.path}`} end>
              {({ isActive }) => (
                <SidebarMenuButton asChild isActive={isActive}>
                  <a>
                    <route.icon />
                    <span>{route.title}</span>
                  </a>
                </SidebarMenuButton>
              )}
            </NavLink>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
