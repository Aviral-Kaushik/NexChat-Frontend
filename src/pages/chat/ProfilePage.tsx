import { useId, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './ProfilePage.module.css'

import { changePassword } from '../../api/user'
import { getApiErrorMessage } from '../../api/errors'
import { clearToken, clearUserName, getToken, getUserName } from '../../api/token'
import axios from 'axios'

function Icon({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden focusable="false">
      <title>{title}</title>
      {children}
    </svg>
  )
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join('') || '?'
}

type ChangePasswordView = 'closed' | 'form' | 'success'

export function ProfilePage() {
  const navigate = useNavigate()
  const name = getUserName() ?? 'User'

  const [changePasswordView, setChangePasswordView] = useState<ChangePasswordView>('closed')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null)

  const currentPasswordId = useId()
  const newPasswordId = useId()
  const confirmPasswordId = useId()

  useEffect(() => {
    if (!getToken()) {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  const initials = useMemo(() => getInitials(name), [name])

  const isChangePasswordSubmitDisabled = useMemo(() => {
    if (isChangingPassword) return true
    if (currentPassword.length === 0 || newPassword.length === 0 || confirmPassword.length === 0) return true
    if (newPassword !== confirmPassword) return true
    return false
  }, [isChangingPassword, currentPassword, newPassword, confirmPassword])

  function handleLogout() {
    clearToken()
    clearUserName()
    navigate('/login', { replace: true })
  }

  function openChangePassword() {
    setChangePasswordView('form')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setChangePasswordError(null)
  }

  function closeChangePassword() {
    setChangePasswordView('closed')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setChangePasswordError(null)
  }

  async function handleChangePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isChangePasswordSubmitDisabled) return
    if (newPassword !== confirmPassword) {
      setChangePasswordError('New password and confirm password do not match.')
      return
    }
    setIsChangingPassword(true)
    setChangePasswordError(null)
    try {
      await changePassword({ currentPassword, newPassword })
      setChangePasswordView('success')
    } catch (err) {
      if (import.meta.env.DEV) console.error('[profile][change-password] error', err)
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setChangePasswordError('Your session has expired. Please log in again.')
      } else {
        setChangePasswordError(getApiErrorMessage(err))
      }
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate('/chats')}
          aria-label="Back to chats"
        >
          <Icon title="Back">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor" />
          </Icon>
        </button>
        <h1 className={styles.headerTitle}>Profile</h1>
        <div className={styles.headerSpacer} />
      </header>

      <main className={styles.main}>
        <aside className={styles.profilePanel}>
          <div className={styles.profileCard}>
            <div className={styles.avatarWrap}>
              <span className={styles.avatar} aria-hidden>
                {initials}
              </span>
            </div>
            <h2 className={styles.profileName}>{name}</h2>
            <p className={styles.profileAbout}>Hey there! I am using NexChat.</p>
            <dl className={styles.infoList}>
              <div className={styles.infoRow}>
                <dt className={styles.infoTerm}>Username</dt>
                <dd className={styles.infoValue}>{name}</dd>
              </div>
              <div className={styles.infoRow}>
                <dt className={styles.infoTerm}>Email</dt>
                <dd className={styles.infoValue}>—</dd>
              </div>
            </dl>
          </div>
          <p className={styles.appVersion}>NexChat</p>
        </aside>

        <div className={styles.optionsPanel}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Account</h3>
            <ul className={styles.optionList} role="list">
              <li>
                <button type="button" className={styles.optionItem}>
                  <span className={styles.optionIconWrap}>
                    <Icon title="Person">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor" />
                    </Icon>
                  </span>
                  <span className={styles.optionLabel}>Account info</span>
                  <Icon title="Chevron">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor" />
                  </Icon>
                </button>
              </li>
              <li>
                <button type="button" className={styles.optionItem} onClick={openChangePassword}>
                  <span className={styles.optionIconWrap}>
                    <Icon title="Lock">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H6.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="currentColor" />
                    </Icon>
                  </span>
                  <span className={styles.optionLabel}>Change password</span>
                  <Icon title="Chevron">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor" />
                  </Icon>
                </button>
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Preferences</h3>
            <ul className={styles.optionList} role="list">
              <li>
                <button type="button" className={styles.optionItem}>
                  <span className={styles.optionIconWrap}>
                    <Icon title="Privacy">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" fill="currentColor" />
                    </Icon>
                  </span>
                  <span className={styles.optionLabel}>Privacy</span>
                  <Icon title="Chevron">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor" />
                  </Icon>
                </button>
              </li>
              <li>
                <button type="button" className={styles.optionItem}>
                  <span className={styles.optionIconWrap}>
                    <Icon title="Chats">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" fill="currentColor" />
                    </Icon>
                  </span>
                  <span className={styles.optionLabel}>Chats</span>
                  <Icon title="Chevron">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor" />
                  </Icon>
                </button>
              </li>
              <li>
                <button type="button" className={styles.optionItem}>
                  <span className={styles.optionIconWrap}>
                    <Icon title="Notifications">
                      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor" />
                    </Icon>
                  </span>
                  <span className={styles.optionLabel}>Notifications</span>
                  <Icon title="Chevron">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor" />
                  </Icon>
                </button>
              </li>
              <li>
                <button type="button" className={styles.optionItem}>
                  <span className={styles.optionIconWrap}>
                    <Icon title="Storage">
                      <path d="M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z" fill="currentColor" />
                    </Icon>
                  </span>
                  <span className={styles.optionLabel}>Storage and data</span>
                  <Icon title="Chevron">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor" />
                  </Icon>
                </button>
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Support</h3>
            <ul className={styles.optionList} role="list">
              <li>
                <button type="button" className={styles.optionItem}>
                  <span className={styles.optionIconWrap}>
                    <Icon title="Help">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" fill="currentColor" />
                    </Icon>
                  </span>
                  <span className={styles.optionLabel}>Help</span>
                  <Icon title="Chevron">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor" />
                  </Icon>
                </button>
              </li>
              <li>
                <button type="button" className={styles.optionItem}>
                  <span className={styles.optionIconWrap}>
                    <Icon title="Invite">
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor" />
                    </Icon>
                  </span>
                  <span className={styles.optionLabel}>Invite a friend</span>
                  <Icon title="Chevron">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor" />
                  </Icon>
                </button>
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <button type="button" className={styles.logoutButton} onClick={handleLogout}>
              <span className={styles.logoutIconWrap}>
                <Icon title="Log out">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor" />
                </Icon>
              </span>
              <span className={styles.logoutLabel}>Log out</span>
            </button>
          </section>
        </div>
      </main>

      {/* Change Password modal */}
      {changePasswordView !== 'closed' && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-password-title"
          onClick={(e) => e.target === e.currentTarget && closeChangePassword()}
        >
          <div className={styles.modalPanel}>
            {changePasswordView === 'success' ? (
              <>
                <div className={styles.successIconWrap} aria-hidden>
                  <Icon title="Success">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" />
                  </Icon>
                </div>
                <h2 id="change-password-title" className={styles.modalTitle}>
                  Password changed
                </h2>
                <p className={styles.modalSubtext}>
                  Your password has been updated successfully. You can close this and continue.
                </p>
                <button type="button" className={styles.modalPrimaryButton} onClick={closeChangePassword}>
                  Done
                </button>
              </>
            ) : (
              <>
                <div className={styles.modalHeader}>
                  <h2 id="change-password-title" className={styles.modalTitle}>
                    Change password
                  </h2>
                  <button
                    type="button"
                    className={styles.modalClose}
                    onClick={closeChangePassword}
                    aria-label="Close"
                  >
                    <Icon title="Close">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor" />
                    </Icon>
                  </button>
                </div>
                <p className={styles.modalSubtext}>
                  Enter your current password and choose a new one. Make sure it&apos;s at least 6 characters.
                </p>
                <form className={styles.changePasswordForm} onSubmit={handleChangePasswordSubmit}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={currentPasswordId}>
                      Current password
                    </label>
                    <div className={styles.inputWrap}>
                      <input
                        id={currentPasswordId}
                        className={styles.input}
                        type={showCurrentPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={isChangingPassword}
                      />
                      <button
                        type="button"
                        className={styles.toggle}
                        onClick={() => setShowCurrentPassword((v) => !v)}
                        disabled={isChangingPassword}
                        aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                      >
                        {showCurrentPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
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
                        disabled={isChangingPassword}
                      />
                      <button
                        type="button"
                        className={styles.toggle}
                        onClick={() => setShowNewPassword((v) => !v)}
                        disabled={isChangingPassword}
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
                        disabled={isChangingPassword}
                      />
                      <button
                        type="button"
                        className={styles.toggle}
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        disabled={isChangingPassword}
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
                  {changePasswordError && (
                    <p className={styles.modalError} role="alert">
                      {changePasswordError}
                    </p>
                  )}
                  <div className={styles.modalActions}>
                    <button
                      type="button"
                      className={styles.modalSecondaryButton}
                      onClick={closeChangePassword}
                      disabled={isChangingPassword}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={styles.modalPrimaryButton}
                      disabled={isChangePasswordSubmitDisabled}
                      aria-busy={isChangingPassword}
                    >
                      {isChangingPassword ? (
                        <span className={styles.loadingRow}>
                          <span className={styles.spinner} aria-hidden="true" />
                          Updating…
                        </span>
                      ) : (
                        'Update password'
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
