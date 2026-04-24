import type { Metadata } from "next";
import localFont from "next/font/local";
// import { Inter_Tight } from "next/font/google";
import "./globals.css";
import Nav from "@/components/shared/Nav/Nav";
import Footerii from "@/components/shared/Footerii/Footerii";
import SessionProvider from "@/components/shared/SessionProvider/SessionProvider";
import ToastsProvider from "@/components/Providers/ToastsProvider";

const suissReg = localFont({
  src: "../../public/fonts/SuisseRegular.ttf",
  variable: "--suisseReg",
  display: "swap",
});

const VisbyCF = localFont({
  src: "../../public/fonts/VisbyCF.ttf",
  variable: "--VisbyCF",
  display: "swap",
});

const BoogyBrutPoster = localFont({
  src: "../../public/fonts/BoogyBrutPoster.woff2",
  variable: "--BoogyBrutPoster",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Friendship Park Helpers",
  description:
    "A simple way to coordinate grocery runs, prescription pickups, and weekly visits — so no one has to do it alone, and no one gets forgotten.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='en'
      className={`${suissReg.variable} ${VisbyCF.variable} ${BoogyBrutPoster.variable}`}
    >
      <body>
        <Nav />
        <SessionProvider>
          <ToastsProvider />
          {children}
        </SessionProvider>

        <Footerii />
      </body>
    </html>
  );
}
