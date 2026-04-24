// import styles from "./page.module.css";
import FirstStep from "@/components/HomePage/FirstStep/FirstStep";
import HowItWorks from "@/components/HomePage/HowItWorks/HowItWorks";
import PostHero from "@/components/HomePage/PostHero/PostHero";
import PageIntro from "@/components/shared/PageIntro/PageIntro";

export default function Home() {
  return (
    <main>
      <PageIntro
        title={"Welcome to"}
        title2='Friendship Park helpers'
        sectionHeading='Friendship Park congregation'
        copy='A simple way to coordinate grocery runs, prescription pickups, and weekly visits — so no one has to do it alone, and no one gets forgotten.'
      />
      <HowItWorks />
      <PostHero />
      <FirstStep />
    </main>
  );
}
