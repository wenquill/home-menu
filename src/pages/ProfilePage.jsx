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
      setProjectError('Оберіть поточний проєкт')
      return
    }

    setIsProjectSubmitting(true)

    try {
      await onSwitchProject?.(Number(selectedProjectId))
      setProjectMessage('Поточний проєкт змінено')
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
      setProjectError('Назва проєкту обовʼязкова')
      return
    }

    setIsProjectSubmitting(true)

    try {
      const project = await onCreateProject?.(newProjectName.trim())
      setNewProjectName('')
      if (project?.id) {
        setSelectedProjectId(String(project.id))
      }
      setProjectMessage('Новий проєкт створено')
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
            placeholder="Введіть поточний пароль"
          />

          <label htmlFor="profile-new-password">Новий пароль</label>
          <input
            id="profile-new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Мінімум 6 символів"
          />

          <label htmlFor="profile-confirm-password">Підтвердити новий пароль</label>
          <input
            id="profile-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Повторіть новий пароль"
          />

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Зберігаю...' : 'Зберегти зміни'}
          </button>
        </form>

        {formError ? <p className="state-message state-message--error">{formError}</p> : null}
        {formMessage ? <p className="state-message">{formMessage}</p> : null}
      </section>

      {canManageProjects ? (
        <section className="admin-panel" aria-label="Керування проєктами">
          <h2>проєкти</h2>

          <form className="admin-form" onSubmit={submitProjectSwitch}>
            <label htmlFor="profile-project-select">Поточний проєкт</label>
            <select
              id="profile-project-select"
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
            >
              <option value="">Оберіть проєкт</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <button type="submit" disabled={isProjectSubmitting || !projects.length}>
              {isProjectSubmitting ? 'Зберігаю...' : 'Змінити поточний проєкт'}
            </button>
          </form>

          <form className="admin-form" onSubmit={submitCreateProject}>
            <label htmlFor="profile-new-project">Створити новий проєкт</label>
            <input
              id="profile-new-project"
              type="text"
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              maxLength={80}
              placeholder="Назва проєкту"
            />
            <button type="submit" disabled={isProjectSubmitting}>
              {isProjectSubmitting ? 'Створюю...' : 'Створити проєкт'}
            </button>
          </form>

          {projectError ? <p className="state-message state-message--error">{projectError}</p> : null}
          {projectMessage ? <p className="state-message">{projectMessage}</p> : null}
        </section>
      ) : null}
    </main>
  )
}
