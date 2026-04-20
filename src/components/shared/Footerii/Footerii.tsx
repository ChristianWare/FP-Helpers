// import Link from "next/link";
import LayoutWrapper from "../LayoutWrapper";
import styles from "./Footerii.module.css";
import Button from "../Button/Button";
// import Insta from "../../../public/icons/instagram.svg";
// import LinkedIn from "../../../public/icons/linkedin.svg";
// import Facebook from "../../../public/icons/facebook.svg";
import Logo from "../Logo/Logo";

const Footerii = () => {
  const footer = [
    {
      id: 1,
      heading: "Quick Links",
      section: [
        {
          id: 1.1,
          name: "E-Commerce Websites",
          href: "/services/ecommerce-stores",
        },
        {
          id: 1.2,
          name: "Business Websites",
          href: "/services/business-websites",
        },
        {
          id: 1.3,
          name: "Booking Websites",
          href: "/services/booking-platforms",
        },
        {
          id: 1.4,
          name: "All Services",
          href: "/services",
        },
      ],
    },
  ];

  const footerii = [
    {
      id: 2,
      heading: "Other Links",
      section: [
        {
          id: 2.1,
          name: "About Us",
          href: "/about",
        },
        {
          id: 2.3,
          name: "Blog",
          href: "/blog",
        },
        {
          id: 2.2,
          name: "Contact Us",
          href: "/contact",
        },
      ],
    },
  ];
  return (
    <footer className={styles.container}>
      <div className={styles.parent}>
        <LayoutWrapper>
          <div className={styles.content}>
            <div className={styles.logoMobile}>
              <Logo />
            </div>
            <div className={styles.top}>
              <div className={styles.box}>
                <Logo />
              </div>
              <div className={styles.box}>
                {footer.map((x) => (
                  <div key={x.id}>
                    <h5 className={styles.sectionHeading}>{x.heading}</h5>
                    <ul className={styles.sectionList}>
                      {x.section.map((y) => (
                        <li key={y.id} className={styles.listItem}>
                          {y.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className={styles.box}>
                {footerii.map((x) => (
                  <div key={x.id}>
                    <h5 className={styles.sectionHeading}>{x.heading}</h5>
                    <ul className={styles.sectionList}>
                      {x.section.map((y) => (
                        <li key={y.id} className={styles.listItem}>
                          <div>{y.name}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className={styles.box}>
                <h5 className={styles.sectionHeading}>Subscribe</h5>
                <p className={styles.newslettterCopy}>
                  Join our newsletter to stay up to date on features and
                  releases.
                </p>
                <form className={styles.form}>
                  <div className={styles.labelInputBox}>
                    <input id='firstName' type='text' />
                  </div>
                  <div className={styles.btnContainer}>
                    <Button
                      btnType='secondary'
                      href='/'
                      text='Subscribe'
                      arrow
                    />
                    <small className={styles.small}>
                      By subscribing you agree to with our Privacy Policy and
                      provide consent to receive updates from our company.
                    </small>
                  </div>
                </form>
              </div>
            </div>
            <div className={styles.bottom}>
              <div className={styles.left}>
                <small className={styles.small1}>
                  Another Website by <b>Fonts & Footers</b> |
                </small>
                <small className={styles.small1}>
                  © 2024 Fonts & Footers. All rights reserved. |
                </small>
                <small className={styles.small1}>Privacy Policy</small>
              </div>
              <div className={styles.right}>
                {/* <div className={styles.leftBottom}>
                  <Link
                    href='https://www.linkedin.com/'
                    target='_blank'
                    aria-label='LinkedIn'
                    className={styles.detail}
                  >
                    <LinkedIn className={styles.icon} width={12} height={12} />
                  </Link>
                  <Link
                    href='https://www.facebook.com/'
                    target='_blank'
                    aria-label='Facebook'
                    className={styles.detail}
                  >
                    <Facebook className={styles.icon} width={12} height={12} />
                  </Link>
                  <Link
                    href='https://instagram.com/'
                    target='_blank'
                    aria-label='Instagram'
                    className={styles.detail}
                  >
                    <Insta className={styles.icon} width={12} height={12} />
                  </Link>
                </div> */}
              </div>
            </div>
          </div>
        </LayoutWrapper>
      </div>
    </footer>
  );
};
export default Footerii;
