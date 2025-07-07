"use client";

import { createTheme, MantineProvider as Provider } from "@mantine/core";

const theme = createTheme({});

export function MantineProvider({ children }: { children: React.ReactNode }) {
  return <Provider theme={theme}>{children}</Provider>;
}
