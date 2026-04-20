"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Button from "../Button/Button";
import { usePathname } from "next/navigation";
import styles from "./Nav.module.css";
import Logo from "../Logo/Logo";
// import ScrollIndicator from "../ScrollIndicator/ScrollIndicator";
// import { useTransitionRouter } from "next-view-transitions";

const navItems = [
  { text: "About", href: "/about" },
  { text: "Services", href: "/services" },
  { text: "Works", href: "/works" },
  { text: "Pricing", href: "/pricing" },
  { text: "Contact", href: "/contact" },
];

const Nav = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLUListElement | null>(null);

//   const router = useTransitionRouter();

  const openMenu = () => {
    setIsOpen((prev) => !prev);
  };

  const pathname = usePathname();
//   function slideInOut() {
//     if (!document.startViewTransition) return;

//     const transition = document.startViewTransition(() => {
      
//     });

//     transition.ready.then(() => {
//       document.documentElement.animate(
//         [
//           { transform: "translateY(0)", opacity: 1 },
//           { transform: "translateY(-35%)", opacity: 0.2 },
//         ],
//         {
//           duration: 1500,
//           easing: "cubic-bezier(0.87, 0, 0.13, 1)",
//           pseudoElement: "::view-transition-old(root)",
//         },
//       );

//       document.documentElement.animate(
//         [
//           { clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)" },
//           { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
//         ],
//         {
//           duration: 1500,
//           easing: "cubic-bezier(0.87, 0, 0.13, 1)",
//           pseudoElement: "::view-transition-new(root)",
//         },
//       );
//     });
//   }

  // Add this at the top of your component
  // const [supportsViewTransitions, setSupportsViewTransitions] = useState(false);

  // useEffect(() => {
  //   setSupportsViewTransitions(
  //     typeof document !== "undefined" && "startViewTransition" in document
  //   );
  // }, []);

  return (
    <>
      <header className={styles.header} ref={navRef}>
        {/* <ScrollIndicator /> */}
        <nav className={styles.navbar}>
          <div className={styles.mobileLogo}>
            <Logo />
          </div>
          <div className={styles.desktopLogo}>
            <Logo />
          </div>

          <ul
            ref={containerRef}
            className={`${styles.navMenu} ${isOpen ? styles.active : ""}`}
          >
            {" "}
            <div className={styles.navBox}>
              {navItems.map((navItem, index) => (
                <li key={index}>
                  <Link
                    href={navItem.href}
                    className={styles.navItem}
                    onClick={(e) => {
                      e.preventDefault();
                      setIsOpen(false);

                    //   if (!document.startViewTransition) {
                    //     router.push(navItem.href);
                    //     return;
                    //   }

                    //   const transition = document.startViewTransition(() => {
                    //     router.push(navItem.href);
                    //   });

                    //   transition.ready.then(() => {
                    //     // Trigger your animations here
                    //     slideInOut();
                    //   });
                    }}
                  >
                    {pathname.includes(navItem.href) && <>{navItem.text}</>}
                    {!pathname.includes(navItem.href) && navItem.text}
                  </Link>
                </li>
              ))}
            </div>
          </ul>

          <div className={styles.btnContainer}>
            <Button
              href='/#schedule'
              text='Schedule discovery call'
              btnType='primaryNav'
            />
          </div>

          <span
            className={
              !isOpen
                ? styles.hamburger
                : `${styles.hamburger} ${styles.active}`
            }
            onClick={openMenu}
          >
            {isOpen ? "Close" : "Menu"}
          </span>
        </nav>
      </header>
    </>
  );
};

export default Nav;
