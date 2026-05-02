"use client";

import { toast, type ExternalToast } from "sonner";
import { DEFAULT_ERROR_MESSAGE, humanizeError } from "./humanize-error";

type NotifyOpts = ExternalToast;

export function notifySuccess(message: string, opts?: NotifyOpts) {
  return toast.success(message, opts);
}

export function notifyError(err: unknown, fallback?: string, opts?: NotifyOpts) {
  const text = humanizeError(err, fallback ?? DEFAULT_ERROR_MESSAGE);
  return toast.error(text, opts);
}

export function notifyInfo(message: string, opts?: NotifyOpts) {
  return toast(message, opts);
}

export function notifyWarning(message: string, opts?: NotifyOpts) {
  return toast.warning(message, opts);
}

export function notifyPromise<T>(
  promise: Promise<T>,
  labels: {
    loading: string;
    success: string | ((data: T) => string);
    error?: string | ((err: unknown) => string);
  },
) {
  return toast.promise(promise, {
    loading: labels.loading,
    success: labels.success,
    error: (err) => {
      if (typeof labels.error === "function") return labels.error(err);
      return humanizeError(err, labels.error);
    },
  });
}

export { toast };
