import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weather Now — current temperature & humidity",
  description:
    "A live look at the temperature, humidity and next 12 hours for your location.",
  applicationName: "Weather Now",
};

export const viewport: Viewport = {
  themeColor: "#fff4f7",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
