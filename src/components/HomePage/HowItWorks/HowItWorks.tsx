import LayoutWrapper from "@/components/shared/LayoutWrapper";
// import Offer from "../Offer/Offer";
import styles from "./HowItWorks.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";

const data = [
  {
    id: 1,
    feature: "Set the list",
    desc: "Recipient adds groceries and prescription pickups throughout the week, right from their own simple view.",
  },
  {
    id: 2,
    feature: "Get the reminder",
    desc: "When it's your turn, the list is waiting — and a reminder goes out by email or WhatsApp two days before your shift.",
  },
  {
    id: 3,
    feature: "Pick it up",
    desc: "Grab the debit card, shop the list, and swing by the pharmacy if there's a prescription ready.",
  },
  {
    id: 4,
    feature: "Deliver and check in",
    desc: "Drop everything off, return the card, and leave a quick note on how your they are doing. That's it!",
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
              <span className={styles.span}>Four simple steps</span>
            </h2>
          </div>
          <div className={styles.box}>
            <div className={styles.middle}>
              <div className={styles.middleLeft}>
                <div className={styles.sectionTitle}></div>
              </div>
              <h4 className={styles.heading}>
                A small group of brothers/sisters rotate each week to help the
                friends in need with groceries and prescription pickups —
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
