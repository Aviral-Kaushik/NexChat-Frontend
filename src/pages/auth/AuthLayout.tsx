import type { ReactNode } from 'react'
import styles from './AuthLayout.module.css'

type AuthLayoutProps = {
  brand?: string
  headline: string
  subhead?: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({
  brand = 'NexChat',
  headline,
  subhead,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden="true">
        <div className={styles.blobA} />
        <div className={styles.blobB} />
        <div className={styles.blobC} />
      </div>

      <div className={styles.container}>
        <aside className={styles.left}>
          <div className={styles.brandRow}>
            <div className={styles.mark} aria-hidden="true" />
            <div className={styles.brandText}>{brand}</div>
          </div>
          <h1 className={styles.heroTitle}>Chat faster. Stay closer.</h1>
          <p className={styles.heroCopy}>
            A clean, modern chat experience built for speed, privacy, and
            real-time connections.
          </p>

          <div className={styles.trustRow} aria-hidden="true">
            <div className={styles.trustPill}>Secure</div>
            <div className={styles.trustPill}>Real-time</div>
            <div className={styles.trustPill}>Fast</div>
          </div>
        </aside>

        <main className={styles.right}>
          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <h2 className={styles.headline}>{headline}</h2>
              {subhead ? <p className={styles.subhead}>{subhead}</p> : null}
            </header>

            <div className={styles.cardBody}>{children}</div>

            {footer ? <footer className={styles.cardFooter}>{footer}</footer> : null}
          </section>
        </main>
      </div>
    </div>
  )
}

