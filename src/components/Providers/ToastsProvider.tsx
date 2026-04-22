/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Suspense, useEffect } from "react";
import { Toaster, toast as hotToast } from "react-hot-toast";
import FlashToasts from "@/components/shared/FlashToasts/FlashToasts";
import "./ToastsProviderAdvanced.module.css";

export default function ToastsProvider() {
  useEffect(() => {
    // Add data attributes to toasts for styling based on type
    const style = document.createElement("style");
    style.innerHTML = `
      [data-sonner-toast][data-type="success"]::before {
        background: linear-gradient(to right, #10b981, #059669) !important;
      }
      [data-sonner-toast][data-type="error"]::before {
        background: linear-gradient(to right, #ef4444, #dc2626) !important;
      }
      [data-sonner-toast][data-type="loading"]::before {
        background: linear-gradient(to right, #3b82f6, #2563eb) !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <>
      <Toaster
        position='bottom-right'
        toastOptions={{
          className: "toastFont customToast",
          duration: 4000, // 4 seconds default
          style: {
            borderRadius: "8px",
            padding: "16px",
            paddingTop: "21px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          },
          success: {
            duration: 3000,
            style: {
              borderRadius: "8px",
              padding: "16px",
              paddingTop: "21px",
              position: "relative",
              overflow: "hidden",
            },
            iconTheme: {
              primary: "#10B981",
              secondary: "#fff",
            },
          },
          error: {
            duration: 5000, // Errors stay longer
            style: {
              borderRadius: "8px",
              padding: "16px",
              paddingTop: "21px",
              position: "relative",
              overflow: "hidden",
            },
            iconTheme: {
              primary: "#EF4444",
              secondary: "#fff",
            },
          },
        }}
      />
      <Suspense fallback={null}>
        <FlashToasts />
      </Suspense>
    </>
  );
}

// Helper functions to use throughout your app
export const toast = {
  success: (message: string, duration?: number) => {
    hotToast.success(message, {
      duration: duration || 3000,
      style: {
        "--toast-duration": `${duration || 3000}ms`,
      } as any,
    });
  },
  error: (message: string, duration?: number) => {
    hotToast.error(message, {
      duration: duration || 5000,
      style: {
        "--toast-duration": `${duration || 5000}ms`,
      } as any,
    });
  },
  loading: (message: string) => {
    return hotToast.loading(message);
  },
  custom: (message: string, options?: any) => {
    hotToast(message, {
      duration: options?.duration || 4000,
      style: {
        "--toast-duration": `${options?.duration || 4000}ms`,
        ...options?.style,
      } as any,
      ...options,
    });
  },
};
