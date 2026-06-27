import { useEffect, useState } from 'react'

export default function CurrentProjectPage({
  currentUser,
  onLoadCurrentProject,
  onInviteToCurrentProject,
  onLoadCurrentProjectMembers,
  onRemoveMemberFromCurrentProject,
  onUpdateMemberRoleInCurrentProject,
}) {
  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [membersError, setMembersError] = useState('')
  const [membersMessage, setMembersMessage] = useState('')
  const [removingMemberId, setRemovingMemberId] = useState(null)
  const [updatingRoleMemberId, setUpdatingRoleMemberId] = useState(null)
  const canInvite = project?.role === 'OWNER' || currentUser?.role === 'ADMIN'
  const canManageMembers = canInvite

  useEffect(() => {
    let isActive = true

    const loadProject = async () => {
      setIsLoading(true)
      setError('')

      try {
        const [projectData, membersData] = await Promise.all([
          onLoadCurrentProject?.(),
          onLoadCurrentProjectMembers?.(),
        ])

        if (isActive) {
          setProject(projectData || null)
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
  }, [onLoadCurrentProject, onLoadCurrentProjectMembers, currentUser?.currentProjectId])

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
      setMembersMessage('Учасника видалено з проєкту')
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

  return (
    <main className="category-page">
      <h1 className="category-title">поточний проєкт</h1>

      <section className="admin-panel" aria-label="Інформація про поточний проєкт">
        {isLoading ? <p className="state-message">Завантаження проєкту...</p> : null}
        {error ? <p className="state-message empty-category-state">{error}</p> : null}

        {!isLoading && !error && project ? (
          <>
            <p><strong>назва:</strong> {project.name}</p>
            <p><strong>учасників:</strong> {project.memberCount}</p>
            <p><strong>ваша роль:</strong> {String(project.role || '').toLowerCase()}</p>

            {canInvite ? (
              <>
                <form className="admin-form" onSubmit={submitInvite}>
                  <label htmlFor="project-invite-email">Запросити користувача в поточний проєкт</label>
                  <input
                    id="project-invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="email користувача"
                  />
                  <button type="submit" disabled={isInviting}>
                    {isInviting ? 'Надсилаю...' : 'Запросити'}
                  </button>
                </form>

                {inviteError ? <p className="state-message state-message--error">{inviteError}</p> : null}
                {inviteMessage ? <p className="state-message">{inviteMessage}</p> : null}
              </>
            ) : (
              <p className="state-message">Запрошувати нових учасників може лише власник проєкту.</p>
            )}

            <section className="project-members-section" aria-label="Учасники поточного проєкту">
              <h2>учасники проєкту</h2>

              {members.length === 0 ? <p className="state-message">У цьому проєкті ще немає учасників.</p> : null}

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
                              <option value="MEMBER">Учасник</option>
                              <option value="EDITOR">Редактор</option>
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
                            {removingMemberId === member.id ? 'Видаляю...' : 'Видалити'}
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
          </>
        ) : null}
      </section>
    </main>
  )
}
