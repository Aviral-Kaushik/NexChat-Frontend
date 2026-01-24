import { Link } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import styles from './ForgotPasswordPage.module.css'

export function ForgotPasswordPage() {
  return (
    <AuthLayout
      headline="Reset your password"
      subhead="Password reset flow will be wired up with backend later."
      footer={
        <div className={styles.footer}>
          <Link className={styles.link} to="/login">
            Back to login
          </Link>
        </div>
      }
    >
      <div className={styles.box}>
        <p className={styles.copy}>
          For now, this is a placeholder screen so the link works. We’ll build the
          full reset form when we integrate auth APIs.
        </p>
      </div>
    </AuthLayout>
  )
}

