import "./globals.css";
import type { ReactNode } from "react";
export const metadata = {
  title: "Kerala Bike Ride",
  description: "Ride. Explore. Discover Kerala.",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
