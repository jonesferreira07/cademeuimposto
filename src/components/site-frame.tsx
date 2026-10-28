"use client";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { Footer } from "./footer";
export function SiteFrame({ children }: { children: React.ReactNode }) {
  return usePathname() === "/" ? children : <><Header />{children}<Footer /></>;
}
