import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import styles from './ForgotPasswordPage.module.css'

import { forgotPassword } from '../../api/auth'
import { getApiErrorMessage } from '../../api/errors'

export function ForgotPasswordPage() {
  const emailId = useId()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const isSubmitDisabled = useMemo(() => {
    if (isLoading) return true
    if (email.trim().length === 0) return true
    return false
  }, [isLoading, email])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isSubmitDisabled) return

    setIsLoading(true)
    setErrorMessage(null)
    setSuccess(false)
    try {
      await forgotPassword(email.trim())
      setSuccess(true)
    } catch (err) {
      if (import.meta.env.DEV) console.error('[forgot-password] error', err)
      setErrorMessage(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <AuthLayout
        headline="Check your email"
        subhead="If an account exists for that address, we've sent a password reset link."
        footer={
          <div className={styles.footer}>
            <Link className={styles.link} to="/login">
              Back to login
            </Link>
          </div>
        }
      >
        <div className={styles.successBox}>
          <div className={styles.successIcon} aria-hidden>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
          </div>
          <p className={styles.successMessage}>
            If an account exists for <strong>{email.trim()}</strong>, we've sent a password reset link to that email.
            Please check your inbox and follow the link to set a new password.
          </p>
          <p className={styles.successHint}>
            Didn't receive the email? Check your spam folder or try again with the same address.
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      headline="Reset your password"
      subhead="Enter the email address for your account and we'll send you a link to reset your password."
      footer={
        <div className={styles.footer}>
          <Link className={styles.link} to="/login">
            Back to login
          </Link>
        </div>
      }
    >
      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={emailId}>
            Email address
          </label>
          <div className={styles.inputWrap}>
            <input
              id={emailId}
              className={styles.input}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        {errorMessage ? (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          className={styles.submit}
          disabled={isSubmitDisabled}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <span className={styles.loadingRow}>
              <span className={styles.spinner} aria-hidden="true" />
              Sending…
            </span>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>
    </AuthLayout>
  )
}

