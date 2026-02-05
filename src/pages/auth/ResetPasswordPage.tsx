import { useId, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import styles from './ResetPasswordPage.module.css'

import { resetPassword } from '../../api/auth'
import { getApiErrorMessage } from '../../api/errors'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''

  const newPasswordId = useId()
  const confirmPasswordId = useId()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const hasValidParams = token.trim().length > 0 && email.trim().length > 0

  const isSubmitDisabled = useMemo(() => {
    if (!hasValidParams || isLoading) return true
    if (newPassword.length === 0 || confirmPassword.length === 0) return true
    if (newPassword !== confirmPassword) return true
    return false
  }, [hasValidParams, isLoading, newPassword, confirmPassword])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isSubmitDisabled) return
    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirm password do not match.')
      return
    }

    setIsLoading(true)
    setErrorMessage(null)
    try {
      await resetPassword({
        email: email.trim(),
        token: token.trim(),
        newPassword,
      })
      setSuccess(true)
    } catch (err) {
      console.error('[reset-password] error', err)
      setErrorMessage(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  if (!hasValidParams) {
    return (
      <AuthLayout
        headline="Invalid reset link"
        subhead="This password reset link is missing required information or has expired."
        footer={
          <div className={styles.footer}>
            <Link className={styles.link} to="/forgot-password">
              Request a new link
            </Link>
            <span className={styles.footerSep}>·</span>
            <Link className={styles.link} to="/login">
              Back to login
            </Link>
          </div>
        }
      >
        <div className={styles.invalidBox}>
          <p className={styles.invalidMessage}>
            Please use the link from your email, or request a new password reset from the login screen.
          </p>
        </div>
      </AuthLayout>
    )
  }

  if (success) {
    return (
      <AuthLayout
        headline="Password reset"
        subhead="Your password has been updated. You can now sign in with your new password."
        footer={
          <div className={styles.footer}>
            <Link className={styles.primaryLink} to="/login">
              Log in again
            </Link>
          </div>
        }
      >
        <div className={styles.successBox}>
          <div className={styles.successIcon} aria-hidden>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <p className={styles.successMessage}>
            Your password has been changed successfully. Click the button below to log in with your new password.
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      headline="Set new password"
      subhead="Enter your new password below. Make sure it is at least 6 characters."
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
          <label className={styles.label} htmlFor={newPasswordId}>
            New password
          </label>
          <div className={styles.inputWrap}>
            <input
              id={newPasswordId}
              className={styles.input}
              type={showNewPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowNewPassword((v) => !v)}
              disabled={isLoading}
              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
            >
              {showNewPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={confirmPasswordId}>
            Confirm new password
          </label>
          <div className={styles.inputWrap}>
            <input
              id={confirmPasswordId}
              className={styles.input}
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowConfirmPassword((v) => !v)}
              disabled={isLoading}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        {newPassword.length > 0 && confirmPassword.length > 0 && newPassword !== confirmPassword && (
          <p className={styles.fieldError} role="alert">
            New password and confirm password do not match.
          </p>
        )}
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
              Resetting…
            </span>
          ) : (
            'Reset password'
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
