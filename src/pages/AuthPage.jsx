import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function AuthPage({ mode, onSubmitAuth }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isRegister = mode === 'register'

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    try {
      await onSubmitAuth({ email, password, mode })
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
            {isSubmitting ? 'Зачекайте...' : isRegister ? 'Зареєструватись' : 'Увійти'}
          </button>
        </form>

        {formError ? <p className="state-message state-message--error">{formError}</p> : null}

        <p className="auth-alt-link">
          {isRegister ? 'Вже є акаунт?' : 'Ще немає акаунта?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'Увійти' : 'Зареєструватись'}
          </Link>
        </p>
      </section>
    </main>
  )
}
