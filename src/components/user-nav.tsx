"use client"

import { useUser } from "@/hooks/use-user"
import type { UserRole } from "@/lib/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronsUpDown } from "lucide-react"

export function UserNav() {
  const { user, setUserRole } = useUser()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 gap-2 px-2">
           <Avatar className="h-8 w-8">
            <AvatarImage src={`https://i.pravatar.cc/32?u=${user.id}`} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground -mt-1">{user.role}</span>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
            <DropdownMenuLabel>Switch Role (Demo)</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={user.role} onValueChange={(role) => setUserRole(role as UserRole)}>
                <DropdownMenuRadioItem value="Employee">Employee</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="Crew Chief">Crew Chief</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="Manager/Admin">Manager/Admin</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="Client">Client</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
