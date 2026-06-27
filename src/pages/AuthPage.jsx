import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function AuthPage({ mode, onSubmitAuth }) {
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isRegister = mode === 'register'

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    if (isRegister && !displayName.trim()) {
      setFormError('Вкажіть імʼя користувача')
      setIsSubmitting(false)
      return
    }

    try {
      await onSubmitAuth({
        email,
        password,
        displayName: displayName.trim(),
        mode,
      })
      navigate('/')
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="category-page">
      <h1>{isRegister ? 'Реєстрація' : 'Вхід'}</h1>

      <section className="admin-panel" aria-label="Форма авторизації">
        <form className="admin-form" onSubmit={submit}>
          {isRegister ? (
            <>
              <label htmlFor="auth-display-name">Імʼя</label>
              <input
                id="auth-display-name"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="ваше імʼя"
                maxLength={60}
                required
              />
            </>
          ) : null}

          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />

          <label htmlFor="auth-password">Пароль</label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
          />

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'зачекайте...' : isRegister ? 'зареєструватись' : 'увійти'}
          </button>
        </form>

        {formError ? <p className="state-message state-message--error">{formError}</p> : null}

        <p className="auth-alt-link">
          {isRegister ? 'Вже є акаунт?' : 'Ще немає акаунта?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'увійти' : 'зареєструватись'}
          </Link>
        </p>
      </section>
    </main>
  )
}
