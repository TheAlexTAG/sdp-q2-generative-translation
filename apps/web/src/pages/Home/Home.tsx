import { NoTranslate } from "../../auto-translator/NoTranslate";
import styles from "./Home.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>
        <NoTranslate>Q2 — very beautiful day</NoTranslate>
        <p data-no-translate>Hello, how are you my g?</p>
        Generative Translation
      </h1>
      <p className={styles.subtitle}>
        Minimal demo. Input → mock API → output. Real model later.
      </p>
      <p>Bonjour mes amis. Comment ca va? I am the real boss</p>
      <p>Eu sou o Alex. Eu sou perfeto</p>
    </div>
  );
}
