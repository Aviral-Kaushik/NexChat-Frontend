import { useId, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import styles from './SignupPage.module.css'

import { login, signup } from '../../api/auth'
import { getApiErrorMessage } from '../../api/errors'
import { setToken, setUserName } from '../../api/token'

export function SignupPage() {
  const usernameId = useId()
  const emailId = useId()
  const passwordId = useId()
  const confirmPasswordId = useId()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword

  const isSubmitDisabled = useMemo(() => {
    if (isLoading) return true
    if (username.trim().length === 0) return true
    if (email.trim().length === 0) return true
    if (password.length === 0) return true
    if (confirmPassword.length === 0) return true
    if (passwordMismatch) return true
    return false
  }, [confirmPassword.length, email, isLoading, password.length, passwordMismatch, username])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isSubmitDisabled) return

    setIsLoading(true)
    setErrorMessage(null)
    try {
      await signup({ username, password, email })
      const { token } = await login({ username, password })
      console.log('[ui][signup] success', { userName: username })
      setToken(token)
      setUserName(username)
      navigate('/chats', { replace: true })
    } catch (err) {
      console.error('[ui][signup] error', err)
      setErrorMessage(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      headline="Create your account"
      subhead="Join NexChat and start chatting in seconds."
      footer={
        <div className={styles.footer}>
          <span className={styles.footerMuted}>Already have an account?</span>{' '}
          <Link className={styles.link} to="/login">
            Log in
          </Link>
        </div>
      }
    >
      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={usernameId}>
            Username
          </label>
          <div className={styles.inputWrap}>
            <input
              id={usernameId}
              className={styles.input}
              name="username"
              type="text"
              inputMode="text"
              autoComplete="username"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={emailId}>
            Email
          </label>
          <div className={styles.inputWrap}>
            <input
              id={emailId}
              className={styles.input}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={passwordId}>
            Password
          </label>
          <div className={styles.inputWrap}>
            <input
              id={passwordId}
              className={styles.input}
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowPassword((v) => !v)}
              disabled={isLoading}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={confirmPasswordId}>
            Confirm password
          </label>
          <div className={styles.inputWrap} data-invalid={passwordMismatch ? 'true' : 'false'}>
            <input
              id={confirmPasswordId}
              className={styles.input}
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
              aria-invalid={passwordMismatch}
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowConfirm((v) => !v)}
              disabled={isLoading}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? 'Hide' : 'Show'}
            </button>
          </div>
          {passwordMismatch ? (
            <p className={styles.error} role="alert">
              Passwords do not match.
            </p>
          ) : null}
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
              Creating account…
            </span>
          ) : (
            'Create account'
          )}
        </button>

        <p className={styles.legal}>
          By creating an account, you agree to our{' '}
          <a className={styles.link} href="#" onClick={(e) => e.preventDefault()}>
            Terms
          </a>{' '}
          and{' '}
          <a className={styles.link} href="#" onClick={(e) => e.preventDefault()}>
            Privacy Policy
          </a>
          .
        </p>
      </form>
    </AuthLayout>
  )
}

