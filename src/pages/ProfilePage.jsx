import { useEffect, useState } from 'react'

const defaultAvatarUrls = [
  '/default-avatars/avatar-1.svg',
  '/default-avatars/avatar-2.svg',
  '/default-avatars/avatar-3.svg',
  '/default-avatars/avatar-4.svg',
  '/default-avatars/avatar-5.svg',
  '/default-avatars/avatar-6.svg',
  '/default-avatars/avatar-7.svg',
  '/default-avatars/avatar-8.svg',
  '/default-avatars/avatar-9.svg',
  '/default-avatars/avatar-10.svg',
]

export default function ProfilePage({
  currentUser,
  projects = [],
  onUpdateProfile,
  onCreateProject,
  onSwitchProject,
  selectedThemeId = 'sunny',
  onThemeChange,
}) {
  const canManageProjects = currentUser?.role === 'ADMIN'
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarDataUrl, setAvatarDataUrl] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [projectMessage, setProjectMessage] = useState('')
  const [projectError, setProjectError] = useState('')
  const [isProjectSubmitting, setIsProjectSubmitting] = useState(false)

  const themeOptions = [
    { id: 'sunny', label: 'Сонячна', swatch: '#ffd84d' },
    { id: 'mint', label: 'Мʼятна', swatch: '#d7f3e7' },
    { id: 'peach', label: 'Персикова', swatch: '#ffe5d6' },
    { id: 'sky', label: 'Небесна', swatch: '#e0efff' },
    { id: 'lavender', label: 'Лавандова', swatch: '#ece4ff' },
    { id: 'rose', label: 'Рожева', swatch: '#ffdfe8' },
    { id: 'sage', label: 'Шавлія', swatch: '#dfead9' },
    { id: 'aqua', label: 'Аква', swatch: '#d9f3f5' },
    { id: 'butter', label: 'Вершкова', swatch: '#fff2c9' },
  ]

  useEffect(() => {
    if (!currentUser) {
      return
    }

    setDisplayName(currentUser.displayName || '')
    setEmail(currentUser.email || '')
    setAvatarDataUrl(currentUser.avatarUrl || '')
    setSelectedProjectId(currentUser.currentProjectId ? String(currentUser.currentProjectId) : '')
  }, [currentUser])

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    setFormMessage('')

    if (newPassword && newPassword !== confirmPassword) {
      setFormError('Підтвердження пароля не співпадає')
      return
    }

    if (!displayName.trim()) {
      setFormError('Імʼя користувача обовʼязкове')
      return
    }

    setIsSubmitting(true)

    try {
      const updatedUser = await onUpdateProfile({
        displayName: displayName.trim(),
        email,
        currentPassword,
        newPassword,
        avatarDataUrl,
      })

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setDisplayName(updatedUser.displayName || '')
      setEmail(updatedUser.email)
      setAvatarDataUrl(updatedUser.avatarUrl || '')
      setFormMessage('Профіль успішно оновлено')
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitProjectSwitch = async (event) => {
    event.preventDefault()
    setProjectError('')
    setProjectMessage('')

    if (!selectedProjectId) {
      setProjectError('оберіть поточний проєкт')
      return
    }

    setIsProjectSubmitting(true)

    try {
      await onSwitchProject?.(Number(selectedProjectId))
    } catch (error) {
      setProjectError(error.message)
    } finally {
      setIsProjectSubmitting(false)
    }
  }

  const submitCreateProject = async (event) => {
    event.preventDefault()
    setProjectError('')
    setProjectMessage('')

    if (!newProjectName.trim()) {
      setProjectError('назва проєкту обовʼязкова')
      return
    }

    setIsProjectSubmitting(true)

    try {
      const project = await onCreateProject?.(newProjectName.trim())
      setNewProjectName('')
      if (project?.id) {
        setSelectedProjectId(String(project.id))
      }
    } catch (error) {
      setProjectError(error.message)
    } finally {
      setIsProjectSubmitting(false)
    }
  }

  return (
    <main className="category-page">
      <h1 className="category-title">Профіль</h1>

      <section className="admin-panel" aria-label="Налаштування профілю">
        <form className="admin-form" onSubmit={submit}>
          <div className="profile-avatar-block">
            <img
              src={avatarDataUrl || '/avatar-placeholder.svg'}
              alt="Аватар користувача"
              className="profile-avatar"
            />
            <div className="default-avatar-grid" aria-label="Оберіть дефолтний аватар">
              {defaultAvatarUrls.map((avatarUrl) => (
                <button
                  key={avatarUrl}
                  type="button"
                  className={
                    avatarDataUrl === avatarUrl
                      ? 'default-avatar-option default-avatar-option--active'
                      : 'default-avatar-option'
                  }
                  onClick={() => setAvatarDataUrl(avatarUrl)}
                  aria-label="Обрати аватар"
                >
                  <img src={avatarUrl} alt="Варіант аватара" />
                </button>
              ))}
            </div>
          </div>

          <label htmlFor="profile-display-name">Імʼя для відображення</label>
          <input
            id="profile-display-name"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={60}
            required
          />

          <label htmlFor="profile-email">Логін (email)</label>
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="profile-current-password">Поточний пароль (для змін логіна/пароля)</label>
          <input
            id="profile-current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="введіть поточний пароль"
          />

          <label htmlFor="profile-new-password">Новий пароль</label>
          <input
            id="profile-new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="мінімум 6 символів"
          />

          <label htmlFor="profile-confirm-password">Підтвердити новий пароль</label>
          <input
            id="profile-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="повторіть новий пароль"
          />

          <label>Тема акценту</label>
          <div className="theme-picker" role="radiogroup" aria-label="Вибір теми">
            {themeOptions.map((theme) => {
              const isActive = selectedThemeId === theme.id

              return (
                <button
                  key={theme.id}
                  type="button"
                  className={isActive ? 'theme-option theme-option--active' : 'theme-option'}
                  onClick={() => onThemeChange?.(theme.id)}
                  role="radio"
                  aria-checked={isActive}
                  aria-label={`Обрати тему ${theme.label}`}
                  title={theme.label}
                  style={{ '--theme-color': theme.swatch }}
                >
                  <span className="theme-option-sr-only">{theme.label}</span>
                </button>
              )
            })}
          </div>

          <button className="save-profile-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'зберігаю...' : 'зберегти зміни'}
          </button>
        </form>

        {formError ? <p className="state-message state-message--error">{formError}</p> : null}
        {formMessage ? <p className="state-message">{formMessage}</p> : null}
      </section>
    </main>
  )
}
