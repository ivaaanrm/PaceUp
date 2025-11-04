"use client"

import { Button } from "@/components/Button"
import { cx, focusRing } from "@/lib/utils"
import { ChevronsUpDown } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

import { DropdownUserProfile } from "./DropdownUserProfile"

export function UserProfile() {
  const { user, isAuthenticated } = useAuth()
  
  const getInitials = () => {
    if (!isAuthenticated || !user) return "G"
    
    const firstname = user.firstname || ""
    const lastname = user.lastname || ""
    
    if (firstname && lastname) {
      return `${firstname[0]}${lastname[0]}`.toUpperCase()
    }
    if (firstname) return firstname[0].toUpperCase()
    if (user.email) return user.email[0].toUpperCase()
    return "U"
  }
  
  const getDisplayName = () => {
    if (!isAuthenticated || !user) return "Guest"
    
    if (user.firstname && user.lastname) {
      return `${user.firstname} ${user.lastname}`
    }
    if (user.firstname) return user.firstname
    return user.email
  }
  
  return (
    <DropdownUserProfile>
      <Button
        aria-label="User settings"
        variant="ghost"
        className={cx(
          "group flex w-full items-center justify-between rounded-md px-1 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200/50 data-[state=open]:bg-gray-200/50 hover:dark:bg-gray-800/50 data-[state=open]:dark:bg-gray-900",
          focusRing,
        )}
      >
        <span className="flex items-center gap-3">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            aria-hidden="true"
          >
            {getInitials()}
          </span>
          <span>{getDisplayName()}</span>
        </span>
        <ChevronsUpDown
          className="size-4 shrink-0 text-gray-500 group-hover:text-gray-700 group-hover:dark:text-gray-400"
          aria-hidden="true"
        />
      </Button>
    </DropdownUserProfile>
  )
}
