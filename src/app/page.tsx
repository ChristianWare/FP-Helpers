// import styles from "./page.module.css";
import PageIntro from "@/components/shared/PageIntro/PageIntro";

export default function Home() {
  return (
    <main>
      <PageIntro
        title={"Welcome to"}
        title2='Friendship park helpers'
        sectionHeading='Friendship park congregation'
        copy='A simple way to coordinate grocery runs, prescription pickups, and weekly visits — so no one has to do it alone, and no one gets forgotten.'
      />
    </main>
  );
}
