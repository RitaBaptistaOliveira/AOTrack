import { Outlet } from "react-router-dom"
import { AppSidebar } from "@/components/navigation/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { UploadIcon, InfoIcon } from "lucide-react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { BreadcrumbNav } from "./components/breadcrumb-nav"

export default function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <header className="bg-card flex shrink-0 items-center shadow-sm justify-between px-4 py-2 transition-[width,height] ease-linear">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="bg-sidebar mr-2 h-4" />
            <BreadcrumbNav />
          </div>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost">
                  <UploadIcon className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Data</DialogTitle>
                  <DialogDescription>
                    Upload your data files here. Supported formats: CSV, JSON, etc.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  <input type="file" />
                </div>
              </DialogContent>
            </Dialog>

            {/* Info Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost">
                  <InfoIcon className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Information</DialogTitle>
                  <DialogDescription>
                    This dashboard allows you to visualize and manage your uploaded data.
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 min-h-0 overflow-hidden">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
