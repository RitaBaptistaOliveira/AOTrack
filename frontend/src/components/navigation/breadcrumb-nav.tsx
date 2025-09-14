import { useLocation, Link } from "react-router-dom"
import { useState, useEffect, type ReactElement } from "react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { useAoSession } from "@/contexts/ao-session-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * Renders the breadcrumb navigation for the dashboard.
 *
 * ```tsx
 * <BreadcrumbNav />
 * ```
 * 
 * Dynamically generates the breadcrumb path based on the current URL.
 * Provides a dropdown for sections that have multiple WFS or Loops, allowing the user to switch between them.
 *
 * @category Component
 */
export function BreadcrumbNav(): ReactElement | null {
  const { metadataSummary, setWfs, setWfc } = useAoSession()
  const location = useLocation()
  const pathnames = location.pathname.split("/").filter(Boolean)
  const section = pathnames[1]
  const label = section?.charAt(0).toUpperCase() + section?.slice(1).replace(/-/g, " ")
  const [selected, setSelected] = useState<string>("")
  const [items, setItems] = useState<string[]>([])

  /**
   * Updates the list of items for the dropdown and sets the default selected value
   * whenever the current section or metadata summary changes.
   *
   * - For "pixels" or "measurements", populates wfs.
   * - For "commands", populates wfc.
   * - For "overview", clears items.
   */
  useEffect(() => {
    if (!metadataSummary) return

    switch (section) {
      case "pixels":
      case "measurements": {
        const s = metadataSummary.wavefront_sensors?.map(wfs => wfs.uid) ?? []
        setItems(s)
        setSelected(s[0])
        break
      }
      case "commands": {
        const c = metadataSummary.wavefront_correctors?.map(wfc => wfc.uid) ?? []
        setItems(c)
        setSelected(c[0])
        break
      }
      case "overview": {
        setItems([])
        break
      }
    }
  }, [section, metadataSummary])

  /**
   * Handles selection changes from the dropdown.
   *
   * Updates the currently selected value in state and informs the AoSession
   * context which WFS or WFC index is now active.
   *
   * @param {string} value - The newly selected item value.
   */
  function setSelectedValue(value: string) {
    const index = items.indexOf(value)
    if (index === -1) return

    setSelected(value)

    switch (section) {
      case "pixels":
      case "measurements":
        setWfs(index)
        break
      case "commands":
        setWfc(index)
        break
    }
  }

  if (!section) return null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild className="text-muted-foreground">
            <Link to="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{label}</BreadcrumbPage>
        </BreadcrumbItem>
        {items.length > 0 &&
          <>
            <BreadcrumbSeparator className="text-foreground" />

            <BreadcrumbItem>

              <Select value={selected} onValueChange={setSelectedValue}>
                <SelectTrigger className="w-full text-foreground">
                  <SelectValue placeholder={selected} />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </BreadcrumbItem>
          </>


        }
      </BreadcrumbList>
    </Breadcrumb>
  )
}
