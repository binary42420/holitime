"use client"

import { useUser } from "@/hooks/use-user"
import { Menu, Button, Avatar, Text, Group } from "@mantine/core"
import { ChevronsUpDown, LogOut, User as UserIcon } from "lucide-react"

export function UserNav() {
  const { user, logout } = useUser()

  if (!user) {
    return null
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <Button variant="subtle" color="gray">
          <Group>
            <Avatar src={user.avatar} alt={user.name} radius="xl">
              {user.name.charAt(0)}
            </Avatar>
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                {user.name}
              </Text>
              <Text c="dimmed" size="xs">
                {user.role}
              </Text>
            </div>
            <ChevronsUpDown size={16} />
          </Group>
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>
          <Text size="sm" fw={500}>
            {user.name}
          </Text>
          <Text size="xs" c="dimmed">
            {user.email}
          </Text>
        </Menu.Label>
        <Menu.Divider />
        <Menu.Item leftSection={<UserIcon size={14} />}>
          Profile
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<LogOut size={14} />} onClick={handleLogout}>
          Log out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
