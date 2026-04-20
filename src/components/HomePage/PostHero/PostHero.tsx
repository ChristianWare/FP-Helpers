import styles from "./PostHero.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Organizer from "@/components/shared/icons/Organizer/Organizer";
import Helper from "@/components/shared/icons/Helper/Helper";
import Recipient from "@/components/shared/icons/Recipient/Recipient";

const data = [
  {
    icon: <Organizer width={75} height={75} className={styles.icon} />,
    feature: "The organizer",
    desc: "You're the one who keeps the group chat going. We give you the tools to turn that energy into a real schedule.",
  },
  {
    icon: <Helper width={75} height={75} className={styles.icon} />,
    feature: "The helper",
    desc: "You want to show up for your neighbor without the mental overhead. We make it easy to know when you're up and what's needed.",
  },
  {
    icon: <Recipient width={75} height={75} className={styles.icon} />,
    feature: "The Recipient",
    desc: "A simple, large-text view where you can say what you need — and see who's coming next.",
  },
];

const PostHero = () => {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading title='Roles' color='black' dotColor='purpleDot' />
            <h2 className={styles.topHeading}>
              Built for <br />
              <span className={styles.span}>everyone</span>
            </h2>
          </div>
          <div className={styles.bottom}>
            {data.map((x, index) => (
              <div key={index} className={styles.box}>
                <div className={styles.boxTop}>
                  <div className={styles.iconContainer}>{x.icon}</div>
                  <h4 className={styles.feature}>{x.feature}</h4>
                </div>
                <div className={styles.boxBottom}>
                  <p className={styles.desc}>{x.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
};
export default PostHero;
