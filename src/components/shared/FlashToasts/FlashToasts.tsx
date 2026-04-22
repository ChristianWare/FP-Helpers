"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";

export default function FlashToasts() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sp = searchParams.toString();

  const lastKeyRef = useRef<string>("");
  const lastAtRef = useRef<number>(0);

  useEffect(() => {
    const params = new URLSearchParams(sp);
    const ok = params.get("ok");
    const err = params.get("err");
    const msg = err ?? ok;

    if (!msg) return;

    const key = `${err ? "err" : "ok"}:${msg}`;
    const now = Date.now();

    if (lastKeyRef.current === key && now - lastAtRef.current < 1200) return;

    lastKeyRef.current = key;
    lastAtRef.current = now;

    const id = `flash-${now}`;
    if (err) toast.error(msg, { id });
    else toast.success(msg, { id });

    params.delete("ok");
    params.delete("err");

    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [sp, pathname, router]);

  return null;
}
