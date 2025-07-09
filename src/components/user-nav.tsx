"use client"

import { useUser } from "@/hooks/use-user"
import { Menu, Button, Avatar, Text, Group, ActionIcon } from "@mantine/core"
import { ChevronsUpDown, LogOut, User as UserIcon, Sun, Moon } from "lucide-react"
import { useTheme } from "./providers/theme-provider"

export function UserNav() {
  const { user, logout } = useUser()
  const { theme, toggleTheme } = useTheme()

  if (!user) {
    return null
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <Menu shadow="lg" width={220} position="bottom-end" withArrow arrowPosition="center">
      <Menu.Target>
        <Button
          variant="subtle"
          color="gray"
          style={{
            borderRadius: '9999px',
            padding: '0.25rem'
          }}
        >
          <Group gap="xs">
            <Avatar src={user.avatar} alt={user.name} radius="xl">
              {user.name.charAt(0)}
            </Avatar>
            <div style={{ flex: 1, textAlign: 'left' }} className="hidden sm:block">
              <Text size="sm" fw={500}>
                {user.name}
              </Text>
              <Text c="dimmed" size="xs">
                {user.role}
              </Text>
            </div>
            <ChevronsUpDown size={16} className="hidden sm:block" />
          </Group>
        </Button>
      </Menu.Target>

      <Menu.Dropdown style={{ borderRadius: '0.75rem', padding: '0.5rem' }}>
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
        <Menu.Item
          leftSection={theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? 'Light' : 'Dark'} Mode
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<LogOut size={14} />} onClick={handleLogout}>
          Log out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
