"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Button from "../Button/Button";
import styles from "./Nav.module.css";
import Logo from "../Logo/Logo";

const navItems = [
  { text: "Home", href: "/" },
  { text: "My Dashboard", href: "/dashboard" },
  { text: "Find", href: "/find" },
  { text: "Create", href: "/create-circle" },
];

const Nav = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const openMenu = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      <header className={styles.header} ref={navRef}>
        <nav className={styles.navbar}>
          <div className={styles.mobileLogo}>
            <Logo />
          </div>
          <div className={styles.desktopLogo}>
            <Logo />
          </div>

          <div
            ref={containerRef}
            className={`${styles.navMenu} ${isOpen ? styles.active : ""}`}
          >
            <ul className={styles.navBox}>
              {navItems.map((navItem, index) => (
                <li key={index}>
                  <Link
                    href={navItem.href}
                    className={styles.navItem}
                    onClick={() => {
                      setIsOpen(false);
                    }}
                  >
                    {navItem.text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

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
