"use client"

import { notifications } from '@mantine/notifications';
import React from 'react';

type ToastProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  variant?: 'default' | 'destructive';
};

export function useToast() {
  const toast = ({ title, description, variant }: ToastProps) => {
    notifications.show({
      title,
      message: description,
      color: variant === 'destructive' ? 'red' : 'blue',
    });
  };

  const dismiss = (id?: string) => {
      if (id) {
        notifications.hide(id);
      } else {
        notifications.clean();
      }
  }

  return { toast, dismiss };
}

export const toast = (props: ToastProps) => {
    notifications.show({
        title: props.title,
        message: props.description,
        color: props.variant === 'destructive' ? 'red' : 'blue',
    });
};
