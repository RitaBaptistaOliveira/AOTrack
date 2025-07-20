"use client"

import { useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

interface PortalProps {
  children: ReactNode
  wrapperId?: string // Optional ID for a specific portal wrapper element
}

function createWrapperAndAppendToBody(wrapperId: string) {
  const wrapperElement = document.createElement("div")
  wrapperElement.setAttribute("id", wrapperId)
  document.body.appendChild(wrapperElement)
  return wrapperElement
}

export default function Portal({ children, wrapperId = "portal-wrapper" }: PortalProps) {
  const [wrapperElement, setWrapperElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    let element = document.getElementById(wrapperId)
    let systemCreated = false

    // If element does not exist, create it and append to body
    if (!element) {
      element = createWrapperAndAppendToBody(wrapperId)
      systemCreated = true
    }
    setWrapperElement(element)

    return () => {
      // Delete the wrapper element if it was created by the system
      if (systemCreated && element?.parentNode) {
        element.parentNode.removeChild(element)
      }
    }
  }, [wrapperId])

  if (!wrapperElement) {
    return null
  }

  return createPortal(children, wrapperElement)
}
