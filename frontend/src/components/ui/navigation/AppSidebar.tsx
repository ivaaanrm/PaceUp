"use client"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarLink,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/Sidebar"
import { RiDashboardLine, RiRunLine, RiSparklingFill, RiCalculatorLine, RiBookOpenLine, RiFileTextLine, RiGithubLine, RiCalendarLine } from "@remixicon/react"
import * as React from "react"
import { UserProfile } from "./UserProfile"
import { usePathname } from "next/navigation"
import { siteConfig } from "@/app/siteConfig"

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: RiDashboardLine,
  },
  {
    name: "Activities",
    href: "/activities",
    icon: RiRunLine,
  },
  {
    name: "AI Insights",
    href: "/insights",
    icon: RiSparklingFill,
  },
  {
    name: "Training Plan",
    href: "/training",
    icon: RiCalendarLine,
  },
  {
    name: "Calculator",
    href: "/calculator",
    icon: RiCalculatorLine,
  },
] as const

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  
  // Get API base URL for docs links
  const getApiBaseUrl = () => {
    if (typeof window === 'undefined') {
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    }
    return process.env.NEXT_PUBLIC_BROWSER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  }
  
  const apiBaseUrl = getApiBaseUrl()
  
  return (
    <Sidebar {...props} className="bg-gray-50 dark:bg-gray-925">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-orange-600 p-1.5 shadow-sm">
            <RiRunLine className="size-6 text-white" />
          </span>
          <div>
            <span className="block text-sm font-semibold text-gray-900 dark:text-gray-50">
              PaceUp
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              Strava Analytics
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarLink
                    href={item.href}
                    isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                    icon={item.icon}
                  >
                    {item.name}
                  </SidebarLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarLink
                  href={`${apiBaseUrl}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  icon={RiBookOpenLine}
                >
                  API Docs
                </SidebarLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarLink
                  href={`${apiBaseUrl}/redoc`}
                  target="_blank"
                  rel="noopener noreferrer"
                  icon={RiFileTextLine}
                >
                  API ReDoc
                </SidebarLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarLink
                  href={siteConfig.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  icon={RiGithubLine}
                >
                  GitHub
                </SidebarLink>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="border-t border-gray-200 dark:border-gray-800" />
        <UserProfile />
      </SidebarFooter>
    </Sidebar>
  )
}
