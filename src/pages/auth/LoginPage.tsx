import { useId, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import styles from './LoginPage.module.css'

import { login } from '../../api/auth'
import { getApiErrorMessage } from '../../api/errors'
import { setToken, setUserName } from '../../api/token'

export function LoginPage() {
  const usernameId = useId()
  const passwordId = useId()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isSubmitDisabled = useMemo(() => {
    if (isLoading) return true
    if (username.trim().length === 0) return true
    if (password.length === 0) return true
    return false
  }, [isLoading, password.length, username])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isSubmitDisabled) return

    setIsLoading(true)
    setErrorMessage(null)
    try {
      const { token } = await login({ username, password })
      console.log('[ui][login] success', { userName: username })
      setToken(token)
      setUserName(username)
      navigate('/chats', { replace: true })
    } catch (err) {
      console.error('[ui][login] error', err)
      setErrorMessage(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      headline="Welcome back"
      subhead="Log in to continue chatting on NexChat."
      footer={
        <div className={styles.footer}>
          <span className={styles.footerMuted}>New to NexChat?</span>{' '}
          <Link className={styles.link} to="/signup">
            Create an account
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
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor={passwordId}>
              Password
            </label>
            <Link className={styles.link} to="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <div className={styles.inputWrap}>
            <input
              id={passwordId}
              className={styles.input}
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
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
              Signing in…
            </span>
          ) : (
            'Log in'
          )}
        </button>
      </form>
    </AuthLayout>
  )
}

