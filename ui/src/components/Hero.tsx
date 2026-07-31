import styles from "./Hero.module.css";

interface HeroProps {
  title: string;
  subtitle: string;
}

export default function Hero({ title, subtitle }: HeroProps) {
  return (
    <div className={styles.hero}>
      <div className={styles.heroInner}>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
