import LayoutWrapper from "@/components/shared/LayoutWrapper";
// import Offer from "../Offer/Offer";
import styles from "./HowItWorks.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";

const data = [
  {
    id: 1,
    feature: "Choose your circle",
    desc: "Start by picking the kind of help that's needed. A standard circle is for groceries and prescription pickups, with helpers taking turns automatically. A meal train is for home-cooked meals, with helpers picking their own days.",
  },
  {
    id: 2,
    feature: "Set the dates",
    desc: "Decide how long it runs — ongoing, or a set period like two weeks after a surgery — and which days: every day, one day a week, or several, like Wednesdays and Saturdays. Add who it's for and where to drop things off.",
  },
  {
    id: 3,
    feature: "Share the link",
    desc: "One link goes in the group chat. In a standard circle, everyone who joins is added to the rotation. In a meal train, they see which days are still open, pick the ones that work for them, and say what they're bringing.",
  },
  {
    id: 4,
    feature: "Keep your friend in the loop",
    desc: "The person being helped gets their own simple page. In a standard circle they add groceries and prescription pickups whenever something comes to mind. In a meal train they see who's coming and what's for dinner, and hear about it each time someone signs up.",
  },
  {
    id: 5,
    feature: "Get the reminder",
    desc: "Before their day, each helper gets a reminder by email or WhatsApp with everything they need — the grocery list and pickup details, or the drop-off time, address, and dietary notes for a meal.",
  },
  {
    id: 6,
    feature: "Deliver and check in",
    desc: "The helper drops off the groceries or the meal and marks it done. On grocery runs they also return the card, log what was spent, and leave a short note on how their friend is doing — that's it!",
  },
];

const HowItWorks = () => {
  return (
    <section className={styles.container}>
      <div className={styles.parent}>
        <LayoutWrapper>
          <div className={styles.top}>
            <SectionHeading
              title='process'
              color='black'
              dotColor='purpleDot'
            />
            <h2 className={styles.heading1}>
              How it works: <br />
              <span className={styles.span}>Six simple steps</span>
            </h2>
          </div>
          <div className={styles.box}>
            <div className={styles.middle}>
              <div className={styles.middleLeft}>
                <div className={styles.sectionTitle}></div>
              </div>
              <h4 className={styles.heading}>
                A small group of brothers/sisters take turns helping friends in
                need — with groceries and prescription pickups on a regular
                schedule, or with home-cooked meals through a meal train —
                organized in one place, so nothing falls through the cracks.
              </h4>
            </div>
            <div className={styles.bottom}>
              {data.map((x) => (
                <div key={x.id} className={styles.card}>
                  <div className={styles.indexContainer}>
                    <span className={styles.index}>{x.id}</span>
                  </div>
                  <div>
                    <h3 className={styles.feature}>{x.feature}</h3>
                    <p className={styles.desc}>{x.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* <Offer /> */}
        </LayoutWrapper>
      </div>
    </section>
  );
};
export default HowItWorks;
