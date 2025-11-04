"use client"

import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function Breadcrumbs() {
  const pathname = usePathname()
  
  // Define route mappings
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean)
    
    if (paths.length === 0) {
      return [
        { label: 'Home', href: '/', current: true }
      ]
    }
    
    const breadcrumbs = [
      { label: 'Home', href: '/', current: false }
    ]
    
    let currentPath = ''
    paths.forEach((path, index) => {
      currentPath += `/${path}`
      
      // Handle dynamic routes
      let label = path
      if (path === 'activities') {
        // Check if this is a detail page (has an ID after activities)
        if (paths[index + 1]) {
          label = 'Activity Details'
        } else {
          label = 'Activities'
        }
      } else if (path === 'insights') {
        label = 'Insights'
      } else {
        // Capitalize first letter and replace dashes with spaces
        label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ')
      }
      
      breadcrumbs.push({
        label,
        href: currentPath,
        current: index === paths.length - 1
      })
    })
    
    return breadcrumbs
  }
  
  const breadcrumbs = getBreadcrumbs()
  
  // Don't show breadcrumbs if we're on the home page
  if (breadcrumbs.length === 1 && breadcrumbs[0].current) {
    return null
  }
  
  return (
    <nav aria-label="Breadcrumb" className="ml-2">
      <ol role="list" className="flex items-center space-x-3 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center">
            {index > 0 && (
              <ChevronRight
                className="size-4 shrink-0 text-gray-600 dark:text-gray-400 mr-3"
                aria-hidden="true"
              />
            )}
            {crumb.current ? (
              <span
                className="text-gray-900 dark:text-gray-50"
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-gray-500 transition hover:text-gray-700 dark:text-gray-400 hover:dark:text-gray-300"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
