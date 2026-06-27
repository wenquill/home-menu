import { useEffect, useState } from 'react'

export default function CurrentProjectPage({
  currentUser,
  projects = [],
  onCreateProject,
  onSwitchProject,
  onLoadCurrentProject,
  onUpdateCurrentProjectInfo,
  onInviteToCurrentProject,
  onLoadCurrentProjectMembers,
  onRemoveMemberFromCurrentProject,
  onUpdateMemberRoleInCurrentProject,
  onDeleteProject,
}) {
  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [boardName, setBoardName] = useState('')
  const [boardNotes, setBoardNotes] = useState('')
  const [boardMessage, setBoardMessage] = useState('')
  const [boardError, setBoardError] = useState('')
  const [isBoardSaving, setIsBoardSaving] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [switchProjectId, setSwitchProjectId] = useState('')
  const [isSwitchingProject, setIsSwitchingProject] = useState(false)
  const [isEditBoardModalOpen, setIsEditBoardModalOpen] = useState(false)
  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardNotes, setNewBoardNotes] = useState('')
  const [newBoardInviteEmails, setNewBoardInviteEmails] = useState('')
  const [isCreatingBoard, setIsCreatingBoard] = useState(false)
  const [createBoardMessage, setCreateBoardMessage] = useState('')
  const [createBoardError, setCreateBoardError] = useState('')
  const [boardToDelete, setBoardToDelete] = useState(null)
  const [deletingBoardId, setDeletingBoardId] = useState(null)
  const [deleteBoardError, setDeleteBoardError] = useState('')
  const [deleteBoardMessage, setDeleteBoardMessage] = useState('')
  const [membersError, setMembersError] = useState('')
  const [membersMessage, setMembersMessage] = useState('')
  const [removingMemberId, setRemovingMemberId] = useState(null)
  const [updatingRoleMemberId, setUpdatingRoleMemberId] = useState(null)
  const canInvite = project?.role === 'OWNER' || currentUser?.role === 'ADMIN'
  const canManageMembers = canInvite
  const canEditCurrentBoard = canInvite

  const parseInviteEmails = (value) => {
    const normalized = String(value || '')
      .split(/[\n,;]/)
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.includes('@'))

    return Array.from(new Set(normalized))
  }

  useEffect(() => {
    let isActive = true

    const loadProject = async () => {
      setIsLoading(true)
      setError('')

      try {
        const projectData = await onLoadCurrentProject?.()
        const canLoadMembers = projectData?.role === 'OWNER' || currentUser?.role === 'ADMIN'
        const membersData = canLoadMembers
          ? await onLoadCurrentProjectMembers?.()
          : { members: [] }

        if (isActive) {
          setProject(projectData || null)
          setBoardName(projectData?.name || '')
          setBoardNotes(projectData?.notes || '')
          setSwitchProjectId(projectData?.id ? String(projectData.id) : '')
          setMembers(Array.isArray(membersData?.members) ? membersData.members : [])
          setMembersError('')
        }
      } catch (loadError) {
        if (isActive) {
          setError(loadError.message)
          setProject(null)
          setMembers([])
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadProject()

    return () => {
      isActive = false
    }
  }, [onLoadCurrentProject, onLoadCurrentProjectMembers, currentUser?.currentProjectId, currentUser?.role])

  useEffect(() => {
    if (!switchProjectId && currentUser?.currentProjectId) {
      setSwitchProjectId(String(currentUser.currentProjectId))
    }
  }, [currentUser?.currentProjectId, switchProjectId])

  const submitCurrentBoardInfo = async (event) => {
    event.preventDefault()
    setBoardError('')
    setBoardMessage('')

    const normalizedName = String(boardName || '').trim()
    if (!normalizedName) {
      setBoardError('Назва дошки обовʼязкова')
      return
    }

    setIsBoardSaving(true)

    try {
      const updated = await onUpdateCurrentProjectInfo?.({
        name: normalizedName,
        notes: String(boardNotes || '').trim(),
      })

      setProject((prev) => ({ ...prev, ...(updated || {}) }))
      setIsEditBoardModalOpen(false)
      setBoardMessage('Інформацію дошки оновлено')
    } catch (saveError) {
      setBoardError(saveError.message)
    } finally {
      setIsBoardSaving(false)
    }
  }

  const submitInvite = async (event) => {
    event.preventDefault()
    setInviteError('')
    setInviteMessage('')

    const normalizedEmail = String(inviteEmail || '').trim().toLowerCase()
    if (!normalizedEmail.includes('@')) {
      setInviteError('Вкажіть коректний email')
      return
    }

    setIsInviting(true)

    try {
      await onInviteToCurrentProject?.(normalizedEmail)
      setInviteEmail('')
      setInviteMessage('Запрошення надіслано')
      const membersData = await onLoadCurrentProjectMembers?.()
      setMembers(Array.isArray(membersData?.members) ? membersData.members : [])
    } catch (inviteApiError) {
      setInviteError(inviteApiError.message)
    } finally {
      setIsInviting(false)
    }
  }

  const handleSwitchProjectChange = async (nextValue) => {
    setSwitchProjectId(nextValue)
    setBoardError('')
    setBoardMessage('')

    const nextProjectId = Number(nextValue)
    if (!Number.isInteger(nextProjectId) || nextProjectId < 1) {
      setBoardError('Оберіть дошку для перемикання')
      return
    }

    if (Number(project?.id) === nextProjectId) {
      return
    }

    setIsSwitchingProject(true)

    try {
      await onSwitchProject?.(nextProjectId)
      const projectData = await onLoadCurrentProject?.()
      const canLoadMembers = projectData?.role === 'OWNER' || currentUser?.role === 'ADMIN'
      const membersData = canLoadMembers
        ? await onLoadCurrentProjectMembers?.()
        : { members: [] }

      setProject(projectData || null)
      setBoardName(projectData?.name || '')
      setBoardNotes(projectData?.notes || '')
      setSwitchProjectId(projectData?.id ? String(projectData.id) : '')
      setMembers(Array.isArray(membersData?.members) ? membersData.members : [])
    } catch (switchError) {
      setBoardError(switchError.message)
      setSwitchProjectId(project?.id ? String(project.id) : '')
    } finally {
      setIsSwitchingProject(false)
    }
  }

  const submitCreateBoard = async (event) => {
    event.preventDefault()
    setCreateBoardError('')
    setCreateBoardMessage('')

    const normalizedName = String(newBoardName || '').trim()
    if (!normalizedName) {
      setCreateBoardError('Назва дошки обовʼязкова')
      return
    }

    setIsCreatingBoard(true)

    try {
      const created = await onCreateProject?.({
        name: normalizedName,
        notes: String(newBoardNotes || '').trim(),
        inviteEmails: parseInviteEmails(newBoardInviteEmails),
      })

      setNewBoardName('')
      setNewBoardNotes('')
      setNewBoardInviteEmails('')
      setIsCreateBoardModalOpen(false)

      if (created?.id) {
        setSwitchProjectId(String(created.id))
      }
    } catch (createError) {
      setCreateBoardError(createError.message)
    } finally {
      setIsCreatingBoard(false)
    }
  }

  const deleteBoard = async () => {
    const boardId = Number(boardToDelete?.id)
    if (!Number.isInteger(boardId) || boardId < 1) {
      return
    }

    setDeleteBoardError('')
    setDeleteBoardMessage('')
    setDeletingBoardId(boardId)

    try {
      await onDeleteProject?.(boardId)
      setBoardToDelete(null)
      if (switchProjectId === String(boardId)) {
        setSwitchProjectId(project?.id ? String(project.id) : '')
      }
    } catch (deleteError) {
      setDeleteBoardError(deleteError.message)
    } finally {
      setDeletingBoardId(null)
    }
  }

  const removeMember = async (member) => {
    const memberId = Number(member?.id)
    if (!Number.isInteger(memberId) || memberId < 1) {
      return
    }

    setMembersError('')
    setMembersMessage('')
    setRemovingMemberId(memberId)

    try {
      await onRemoveMemberFromCurrentProject?.(memberId)
      setMembers((prev) => prev.filter((item) => item.id !== memberId))
    } catch (removeError) {
      setMembersError(removeError.message)
    } finally {
      setRemovingMemberId(null)
    }
  }

  const updateMemberRole = async (member, nextPermissionsRole) => {
    const memberId = Number(member?.id)
    if (!Number.isInteger(memberId) || memberId < 1) {
      return
    }

    if (member.permissionsRole === nextPermissionsRole) {
      return
    }

    setMembersError('')
    setMembersMessage('')
    setUpdatingRoleMemberId(memberId)

    try {
      const updated = await onUpdateMemberRoleInCurrentProject?.(memberId, nextPermissionsRole)
      setMembers((prev) => prev.map((item) => (
        item.id === memberId
          ? { ...item, permissionsRole: updated?.permissionsRole || nextPermissionsRole }
          : item
      )))
      setMembersMessage('Роль учасника оновлено')
    } catch (updateError) {
      setMembersError(updateError.message)
    } finally {
      setUpdatingRoleMemberId(null)
    }
  }

  const currentRole = String(project?.role || '').toLowerCase()
  const currentPermissions = String(project?.permissionsRole || '').toLowerCase()

  return (
    <main className="category-page current-board-page">
      <h1 className="category-title">дошка</h1>

      <section className="admin-panel" aria-label="Інформація про поточну дошку">
        {isLoading ? <p className="state-message">Завантаження дошки...</p> : null}
        {error ? <p className="state-message empty-category-state">{error}</p> : null}

        {!isLoading && !error && project ? (
          <>
            <section className="board-info-hero" aria-label="Інформація про дошку">
              <div className="board-info-hero-header">
                <p className="board-info-kicker">поточна дошка</p>
                <div className="board-info-hero-actions">
                  <span className="board-role-pill">роль: {currentRole || 'учасник'}</span>
                  {canEditCurrentBoard ? (
                    <button
                      type="button"
                      className="dish-icon-button board-info-edit-button"
                      aria-label="Редагувати дошку"
                      title="Редагувати дошку"
                      onClick={() => {
                        setBoardError('')
                        setIsEditBoardModalOpen(true)
                      }}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ fill: 'none' }} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 21h4.2L20.4 7.8a1.5 1.5 0 0 0 0-2.1l-2.1-2.1a1.5 1.5 0 0 0-2.1 0L3 16.8V21z" />
                        <path d="m13.5 6.5 4 4" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </div>

              <h2 className="board-info-title">{project.name}</h2>
              <p className="board-info-notes">
                {project.notes || 'Додайте нотатки, щоб команда швидко розуміла контекст дошки.'}
              </p>

              <div className="board-info-stats">
                <article className="board-info-stat">
                  <span>учасників</span>
                  <strong>{project.memberCount}</strong>
                </article>
                <article className="board-info-stat">
                  <span>ваші права</span>
                  <strong>{currentPermissions === 'editor' ? 'редактор' : 'учасник'}</strong>
                </article>
                <article className="board-info-stat">
                  <span>усього дошок</span>
                  <strong>{projects.length}</strong>
                </article>
              </div>

              {canManageMembers ? (
                <section className="project-members-section" aria-label="Учасники поточної дошки">
                  <h2>учасники дошки</h2>

                  {members.length === 0 ? <p className="state-message">На цій дошці ще немає учасників.</p> : null}

                  {members.length > 0 ? (
                    <ul className="project-members-list">
                      {members.map((member) => {
                        const isCurrentUser = Number(member.id) === Number(currentUser?.id)
                        const canRemoveMember = canManageMembers && !isCurrentUser
                        const canEditPermissions = canManageMembers && member.role !== 'OWNER'
                        const currentPermissionsRole = String(member.permissionsRole || 'MEMBER').toUpperCase()

                        return (
                          <li key={member.id} className="project-members-item">
                            <div className="project-members-item-main">
                              <img
                                src={member.avatarUrl || '/avatar-placeholder.svg'}
                                alt="Аватар учасника"
                                className="project-members-avatar"
                              />
                              <div>
                                <p className="project-members-name">{member.displayName || member.email}</p>
                                <p className="project-members-meta">
                                  {member.email} • роль: {String(member.role || '').toLowerCase()} • права:{' '}
                                  {currentPermissionsRole === 'EDITOR' ? 'редактор' : 'учасник'}
                                </p>
                              </div>
                            </div>

                            {canEditPermissions ? (
                              <label className="project-members-role-control">
                                <select
                                  value={currentPermissionsRole}
                                  onChange={(event) => {
                                    void updateMemberRole(member, event.target.value)
                                  }}
                                  disabled={updatingRoleMemberId === member.id}
                                >
                                  <option value="MEMBER">учасник</option>
                                  <option value="EDITOR">редактор</option>
                                </select>
                              </label>
                            ) : null}

                            {canRemoveMember ? (
                              <button
                                type="button"
                                className="project-members-remove"
                                onClick={() => {
                                  void removeMember(member)
                                }}
                                disabled={removingMemberId === member.id}
                              >
                                {removingMemberId === member.id ? 'видаляю...' : 'видалити'}
                              </button>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}

                  {membersError ? <p className="state-message state-message--error">{membersError}</p> : null}
                  {membersMessage ? <p className="state-message">{membersMessage}</p> : null}
                </section>
              ) : null}
            </section>

            <div className="admin-form">
              <label htmlFor="switch-board-select">Перемикання між дошками</label>
              <select
                id="switch-board-select"
                value={switchProjectId}
                onChange={(event) => {
                  void handleSwitchProjectChange(event.target.value)
                }}
                disabled={isSwitchingProject || !projects.length}
              >
                <option value="">Оберіть дошку</option>
                {projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {isSwitchingProject ? <p className="state-message">Перемикаю дошку...</p> : null}
            </div>

            <div className="board-controls-row">
              <button
                type="button"
                className="board-primary-action"
                onClick={() => {
                  setCreateBoardError('')
                  setIsCreateBoardModalOpen(true)
                }}
              >
                + створити нову дошку
              </button>
            </div>

            {boardError ? <p className="state-message state-message--error">{boardError}</p> : null}
            {boardMessage ? <p className="state-message">{boardMessage}</p> : null}

            {createBoardError ? <p className="state-message state-message--error">{createBoardError}</p> : null}
            {createBoardMessage ? <p className="state-message">{createBoardMessage}</p> : null}

            <section className="project-members-section" aria-label="Ваші дошки">
              <h2>ваші дошки</h2>
              <ul className="project-members-list">
                {projects.map((item) => {
                  const isCurrentBoard = Number(item.id) === Number(project.id)
                  const canDeleteBoard = !isCurrentBoard && (currentUser?.role === 'ADMIN' || item.role === 'OWNER')

                  return (
                    <li key={item.id} className="project-members-item">
                      <div className="project-members-item-main">
                        <div>
                          <p className="project-members-name">
                            {item.name} {isCurrentBoard ? '(поточна)' : ''}
                          </p>
                          <p className="project-members-meta">
                            роль: {String(item.role || '').toLowerCase()} • права:{' '}
                            {String(item.permissionsRole || '').toUpperCase() === 'EDITOR' ? 'редактор' : 'учасник'}
                          </p>
                        </div>
                      </div>

                      {canDeleteBoard ? (
                        <button
                          type="button"
                          className="project-members-remove"
                          onClick={() => {
                            setDeleteBoardError('')
                            setBoardToDelete(item)
                          }}
                          disabled={deletingBoardId === item.id}
                        >
                          {deletingBoardId === item.id ? 'видаляю...' : 'видалити'}
                        </button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>

              {deleteBoardError ? <p className="state-message state-message--error">{deleteBoardError}</p> : null}
              {deleteBoardMessage ? <p className="state-message">{deleteBoardMessage}</p> : null}
            </section>

            {!canInvite ? (
              <p className="state-message">Ви можете переглядати дошку, але редагування доступне лише власнику.</p>
            ) : null}

          </>
        ) : null}
      </section>

      {boardToDelete ? (
        <div className="dish-modal-overlay" role="presentation" onClick={() => setBoardToDelete(null)}>
          <section
            className="dish-modal dish-modal--confirm"
            role="dialog"
            aria-modal="true"
            aria-label={`Видалити дошку ${boardToDelete.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dish-modal-header">
              <h2>видалити дошку?</h2>
              <button
                type="button"
                className="dish-modal-close"
                aria-label="Закрити"
                onClick={() => setBoardToDelete(null)}
              >
                ×
              </button>
            </div>

            <p className="dish-modal-warning">
              Дошка <strong>{boardToDelete.name}</strong> буде видалена назавжди.
            </p>

            {deleteBoardError ? <p className="state-message state-message--error">{deleteBoardError}</p> : null}

            <div className="dish-modal-actions dish-modal-actions--confirm">
              <button type="button" className="dish-modal-secondary" onClick={() => setBoardToDelete(null)}>
                скасувати
              </button>
              <button
                type="button"
                className="dish-modal-danger"
                onClick={() => {
                  void deleteBoard()
                }}
                disabled={deletingBoardId === boardToDelete.id}
              >
                {deletingBoardId === boardToDelete.id ? 'видаляю...' : 'видалити'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isEditBoardModalOpen ? (
        <div className="dish-modal-overlay" role="presentation" onClick={() => setIsEditBoardModalOpen(false)}>
          <section
            className="dish-modal admin-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Редагувати дошку"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dish-modal-header">
              <h2>редагувати дошку</h2>
              <button
                type="button"
                className="dish-modal-close"
                aria-label="Закрити"
                onClick={() => setIsEditBoardModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form className="admin-form" onSubmit={submitCurrentBoardInfo}>
              <label htmlFor="current-board-name">Назва дошки</label>
              <input
                id="current-board-name"
                type="text"
                value={boardName}
                onChange={(event) => setBoardName(event.target.value)}
                maxLength={80}
                required
              />

              <label htmlFor="current-board-notes">Нотатки</label>
              <textarea
                id="current-board-notes"
                value={boardNotes}
                onChange={(event) => setBoardNotes(event.target.value)}
                maxLength={600}
                rows={4}
                placeholder="короткий опис дошки"
              />

              {boardError ? <p className="state-message state-message--error">{boardError}</p> : null}

              <button type="submit" disabled={isBoardSaving}>
                {isBoardSaving ? 'зберігаю...' : 'зберегти інформацію дошки'}
              </button>
            </form>

            <form className="admin-form" onSubmit={submitInvite}>
              <label htmlFor="project-invite-email">Запросити користувача в поточну дошку</label>
              <input
                id="project-invite-email"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="email користувача"
              />
              <button type="submit" disabled={isInviting}>
                {isInviting ? 'надсилаю...' : 'запросити'}
              </button>
            </form>

            {inviteError ? <p className="state-message state-message--error">{inviteError}</p> : null}
            {inviteMessage ? <p className="state-message">{inviteMessage}</p> : null}
          </section>
        </div>
      ) : null}

      {isCreateBoardModalOpen ? (
        <div className="dish-modal-overlay" role="presentation" onClick={() => setIsCreateBoardModalOpen(false)}>
          <section
            className="dish-modal admin-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Створити нову дошку"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dish-modal-header">
              <h2>створити нову дошку</h2>
              <button
                type="button"
                className="dish-modal-close"
                aria-label="Закрити"
                onClick={() => setIsCreateBoardModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form className="admin-form" onSubmit={submitCreateBoard}>
              <label htmlFor="new-board-name">Назва дошки</label>
              <input
                id="new-board-name"
                type="text"
                value={newBoardName}
                onChange={(event) => setNewBoardName(event.target.value)}
                maxLength={80}
                placeholder="назва дошки"
                required
              />

              <label htmlFor="new-board-notes">Нотатки до дошки</label>
              <textarea
                id="new-board-notes"
                value={newBoardNotes}
                onChange={(event) => setNewBoardNotes(event.target.value)}
                maxLength={600}
                rows={3}
                placeholder="опис або контекст"
              />

              <label htmlFor="new-board-invites">Запросити користувачів (необовʼязково)</label>
              <textarea
                id="new-board-invites"
                value={newBoardInviteEmails}
                onChange={(event) => setNewBoardInviteEmails(event.target.value)}
                rows={3}
                placeholder="email1@example.com, email2@example.com"
              />

              {createBoardError ? <p className="state-message state-message--error">{createBoardError}</p> : null}

              <button type="submit" disabled={isCreatingBoard}>
                {isCreatingBoard ? 'створюю...' : 'створити дошку'}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}
