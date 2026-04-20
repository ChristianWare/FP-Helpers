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
    desc: "The one who brings the group together — setting up the arrangements, inviting helpers, and keeping the schedule running in the background.",
  },
  {
    icon: <Helper width={75} height={75} className={styles.icon} />,
    feature: "The helper",
    desc: "One of the brothers/sisters in the rotation — showing up on their week to handle groceries, prescriptions, and a quick check-in on how things are going.",
  },
  {
    icon: <Recipient width={75} height={75} className={styles.icon} />,
    feature: "The recipient",
    desc: "The friend being looked after — sharing what they need through a simple, large-text view and always knowing who's coming next.",
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
