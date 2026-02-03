import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './ProfilePage.module.css'

import { clearToken, clearUserName, getToken, getUserName } from '../../api/token'

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

export function ProfilePage() {
  const navigate = useNavigate()
  const name = getUserName() ?? 'User'

  useEffect(() => {
    if (!getToken()) {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  const initials = useMemo(() => getInitials(name), [name])

  function handleLogout() {
    clearToken()
    clearUserName()
    navigate('/login', { replace: true })
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
                <button type="button" className={styles.optionItem}>
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
    </div>
  )
}
