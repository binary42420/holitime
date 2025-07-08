"use client";

import { createTheme, MantineProvider as Provider } from "@mantine/core";
import { colors } from "@/lib/color-scheme";
import { useTheme } from "./theme-provider";

export function MantineProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const activeColors = theme === 'dark' ? colors.dark : colors.light;

  const mantineTheme = createTheme({
    colors: {
      primary: [
        activeColors.primary.light,
        activeColors.primary.light,
        activeColors.primary.DEFAULT,
        activeColors.primary.DEFAULT,
        activeColors.primary.dark,
        activeColors.primary.dark,
        activeColors.primary.dark,
        activeColors.primary.dark,
        activeColors.primary.dark,
        activeColors.primary.dark,
      ],
    },
    primaryColor: 'primary',
    components: {
      Card: {
        styles: {
          root: {
            backgroundColor: activeColors.surface,
            color: activeColors.text.primary,
            boxShadow: theme === 'light'
              ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              : '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
            border: `1px solid ${activeColors.background}`,
          },
        },
      },
      Accordion: {
        styles: {
          item: {
            backgroundColor: activeColors.surface,
            border: `1px solid ${activeColors.background}`,
            borderRadius: '0.5rem',
            boxShadow: theme === 'light'
              ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              : '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            transition: 'box-shadow 0.2s ease-in-out',
            '&:hover': {
              boxShadow: theme === 'light'
                ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                : '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.15)',
            }
          },
          control: {
            backgroundColor: activeColors.surface,
            color: activeColors.text.primary,
            '&:hover': {
              backgroundColor: activeColors.background,
            },
          },
          panel: {
            backgroundColor: activeColors.surface,
            color: activeColors.text.primary,
          },
        },
      },
    },
  });

  return <Provider theme={mantineTheme}>{children}</Provider>;
}
