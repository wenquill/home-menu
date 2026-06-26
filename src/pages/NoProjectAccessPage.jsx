export default function NoProjectAccessPage() {
  return (
    <main className="no-project-page" aria-label="Немає доступу до проєкту">
      <section className="no-project-card">
        <div className="no-project-illustration" aria-hidden="true">
          <div className="no-project-envelope" />
          <div className="no-project-letter" />
          <div className="no-project-bubble no-project-bubble--one" />
          <div className="no-project-bubble no-project-bubble--two" />
          <div className="no-project-bubble no-project-bubble--three" />
        </div>

        <h1>вас ще не запрошено до проєкту</h1>
        <p>
          доступ до меню зʼявиться після того, як адміністратор додасть вас у проєкт.
          перевірте пошту або напишіть адміну.
        </p>
      </section>
    </main>
  )
}
