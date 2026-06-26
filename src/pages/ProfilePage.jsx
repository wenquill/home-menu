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

export default function ProfilePage({ currentUser, onUpdateProfile }) {
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarDataUrl, setAvatarDataUrl] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!currentUser) {
      return
    }

    setEmail(currentUser.email || '')
    setAvatarDataUrl(currentUser.avatarUrl || '')
  }, [currentUser])

  const onAvatarChange = (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setFormError('Оберіть файл зображення для аватара')
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setAvatarDataUrl(String(reader.result || ''))
      setFormError('')
    }

    reader.readAsDataURL(file)
  }

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    setFormMessage('')

    if (newPassword && newPassword !== confirmPassword) {
      setFormError('Підтвердження пароля не співпадає')
      return
    }

    setIsSubmitting(true)

    try {
      const updatedUser = await onUpdateProfile({
        email,
        currentPassword,
        newPassword,
        avatarDataUrl,
      })

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setEmail(updatedUser.email)
      setAvatarDataUrl(updatedUser.avatarUrl || '')
      setFormMessage('Профіль успішно оновлено')
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="category-page">
      <h1>Профіль</h1>

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
            <label className="avatar-upload-label" htmlFor="avatar-upload">
              Завантажити фотографію
            </label>
            <input
              className="avatar-upload-input"
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={onAvatarChange}
            />
          </div>

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
    </main>
  )
}
