/**
 * MailmapDetailsPanel - Manage author identity mappings via .mailmap
 *
 * Surfaces Git's native .mailmap feature with a drag-and-drop UI for
 * combining author identities. Part of Ledger's "Opinionated Git" approach.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { AuthorIdentity, MailmapEntry } from '../../../types/electron'
import type { StatusMessage } from '../../../types/app-types'

export interface MailmapDetailsPanelProps {
  onStatusChange?: (status: StatusMessage | null) => void
}

interface MergedIdentity {
  canonical: AuthorIdentity
  aliases: AuthorIdentity[]
}

export function MailmapDetailsPanel({
  onStatusChange,
}: MailmapDetailsPanelProps) {
  const [identities, setIdentities] = useState<AuthorIdentity[]>([])
  const [existingMailmap, setExistingMailmap] = useState<MailmapEntry[]>([])
  const [mergedIdentities, setMergedIdentities] = useState<MergedIdentity[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draggedIdentity, setDraggedIdentity] = useState<AuthorIdentity | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  
  const draggedRef = useRef<HTMLDivElement | null>(null)

  // Load identities and existing mailmap
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [allIdentities, mailmap] = await Promise.all([
          window.electronAPI.getAuthorIdentities(),
          window.electronAPI.getMailmap(),
        ])
        
        setIdentities(allIdentities)
        setExistingMailmap(mailmap)
        
        // Initialize merged identities from existing mailmap
        const merged: MergedIdentity[] = []
        const usedEmails = new Set<string>()
        
        // Group existing mailmap entries by canonical email
        const mailmapGroups = new Map<string, MailmapEntry[]>()
        for (const entry of mailmap) {
          const key = entry.canonicalEmail.toLowerCase()
          if (!mailmapGroups.has(key)) {
            mailmapGroups.set(key, [])
          }
          mailmapGroups.get(key)!.push(entry)
        }
        
        // Build merged identities from mailmap
        for (const [canonicalEmail, entries] of mailmapGroups) {
          const canonical = allIdentities.find(i => i.email.toLowerCase() === canonicalEmail)
          if (!canonical) continue
          
          usedEmails.add(canonicalEmail)
          const aliases: AuthorIdentity[] = []
          
          for (const entry of entries) {
            const alias = allIdentities.find(i => i.email.toLowerCase() === entry.aliasEmail.toLowerCase())
            if (alias) {
              aliases.push(alias)
              usedEmails.add(alias.email.toLowerCase())
            }
          }
          
          if (aliases.length > 0) {
            merged.push({ canonical, aliases })
          }
        }
        
        setMergedIdentities(merged)
      } catch (error) {
        console.error('Error loading identities:', error)
        onStatusChange?.({ type: 'error', message: 'Failed to load author identities' })
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [onStatusChange])

  // Get identities that are not yet merged (standalone)
  const standaloneIdentities = useMemo(() => {
    const mergedEmails = new Set<string>()
    for (const merged of mergedIdentities) {
      mergedEmails.add(merged.canonical.email.toLowerCase())
      for (const alias of merged.aliases) {
        mergedEmails.add(alias.email.toLowerCase())
      }
    }
    return identities.filter(identity => !mergedEmails.has(identity.email.toLowerCase()))
  }, [identities, mergedIdentities])

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, identity: AuthorIdentity) => {
    setDraggedIdentity(identity)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', identity.email)
    
    // Add dragging class after a tick for visual feedback
    setTimeout(() => {
      if (draggedRef.current) {
        draggedRef.current.classList.add('dragging')
      }
    }, 0)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedIdentity(null)
    setDropTarget(null)
    if (draggedRef.current) {
      draggedRef.current.classList.remove('dragging')
    }
  }, [])

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent, targetEmail: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    
    // Don't allow dropping on self
    if (draggedIdentity?.email === targetEmail) return
    
    setDropTarget(targetEmail)
  }, [draggedIdentity])

  // Handle drag leave - only clear if actually leaving the card (not just moving between children)
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.stopPropagation()
    // Check if we're leaving to an element outside this card
    const relatedTarget = e.relatedTarget as Node | null
    const currentTarget = e.currentTarget as Node
    
    // If the related target is inside the current target, don't clear
    if (relatedTarget && currentTarget.contains(relatedTarget)) {
      return
    }
    
    setDropTarget(null)
  }, [])

  // Handle drop - merge dragged identity into target
  const handleDrop = useCallback((e: React.DragEvent, target: AuthorIdentity) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Store current dragged identity before clearing
    const currentDragged = draggedIdentity
    
    // Clear visual feedback
    if (draggedRef.current) {
      draggedRef.current.classList.remove('dragging')
    }
    document.querySelectorAll('.mailmap-identity-card.dragging').forEach(el => {
      el.classList.remove('dragging')
    })
    
    // Validate drop
    if (!currentDragged || currentDragged.email.toLowerCase() === target.email.toLowerCase()) {
      setDropTarget(null)
      setDraggedIdentity(null)
      return
    }
    
    const draggedEmail = currentDragged.email.toLowerCase()
    const targetEmail = target.email.toLowerCase()
    
    // Update merged identities
    setMergedIdentities(prev => {
      // Check if target is already a canonical
      const existingMergeIndex = prev.findIndex(m => m.canonical.email.toLowerCase() === targetEmail)
      
      if (existingMergeIndex >= 0) {
        // Add to existing merge
        return prev.map((m, idx) => {
          if (idx === existingMergeIndex) {
            // Check if dragged was a canonical of another merge - bring its aliases too
            const draggedMerge = prev.find(dm => dm.canonical.email.toLowerCase() === draggedEmail)
            const newAliases = draggedMerge 
              ? [currentDragged, ...draggedMerge.aliases]
              : [currentDragged]
            
            return {
              ...m,
              aliases: [...m.aliases, ...newAliases.filter(a => 
                !m.aliases.some(ea => ea.email.toLowerCase() === a.email.toLowerCase())
              )]
            }
          }
          return m
        }).filter(m => m.canonical.email.toLowerCase() !== draggedEmail) // Remove if dragged was a canonical
      } else {
        // Check if dragged was a canonical
        const draggedMerge = prev.find(m => m.canonical.email.toLowerCase() === draggedEmail)
        
        // Create new merge
        const newMerge: MergedIdentity = {
          canonical: target,
          aliases: draggedMerge 
            ? [currentDragged, ...draggedMerge.aliases]
            : [currentDragged]
        }
        
        return [
          ...prev.filter(m => m.canonical.email.toLowerCase() !== draggedEmail),
          newMerge
        ]
      }
    })
    
    // Clear drag state AFTER state update
    setDropTarget(null)
    setDraggedIdentity(null)
    setHasChanges(true)
  }, [draggedIdentity])

  // Handle removing an alias from a merge
  const handleRemoveAlias = useCallback((canonicalEmail: string, aliasEmail: string) => {
    const canonicalLower = canonicalEmail.toLowerCase()
    const aliasLower = aliasEmail.toLowerCase()
    
    setMergedIdentities(prev => {
      return prev.map(m => {
        if (m.canonical.email.toLowerCase() === canonicalLower) {
          const newAliases = m.aliases.filter(a => a.email.toLowerCase() !== aliasLower)
          // If no more aliases, remove the merge entirely
          if (newAliases.length === 0) {
            return null
          }
          return { ...m, aliases: newAliases }
        }
        return m
      }).filter(Boolean) as MergedIdentity[]
    })
    setHasChanges(true)
  }, [])

  // Save changes to .mailmap
  const handleSave = useCallback(async () => {
    setSaving(true)
    onStatusChange?.({ type: 'info', message: 'Saving to .mailmap...' })
    
    try {
      // Build mailmap entries from merged identities
      const entries: MailmapEntry[] = []
      
      for (const merged of mergedIdentities) {
        for (const alias of merged.aliases) {
          entries.push({
            canonicalName: merged.canonical.name,
            canonicalEmail: merged.canonical.email,
            aliasName: alias.name !== merged.canonical.name ? alias.name : undefined,
            aliasEmail: alias.email,
          })
        }
      }
      
      const result = await window.electronAPI.addMailmapEntries(entries)
      
      if (result.success) {
        onStatusChange?.({ type: 'success', message: result.message })
        setHasChanges(false)
        setExistingMailmap(await window.electronAPI.getMailmap())
      } else {
        onStatusChange?.({ type: 'error', message: result.message })
      }
    } catch (error) {
      onStatusChange?.({ type: 'error', message: 'Failed to save .mailmap' })
    } finally {
      setSaving(false)
    }
  }, [mergedIdentities, onStatusChange])

  // Render an identity card
  const renderIdentityCard = (
    identity: AuthorIdentity,
    isCanonical: boolean = false,
    onRemove?: () => void
  ) => {
    const emailLower = identity.email.toLowerCase()
    const isDragging = draggedIdentity?.email.toLowerCase() === emailLower
    const isDropTarget = dropTarget?.toLowerCase() === emailLower && !isDragging
    
    // Canonical identities with aliases cannot be dragged (they'd orphan their group)
    const hasAliases = isCanonical && mergedIdentities.some(
      m => m.canonical.email.toLowerCase() === emailLower && m.aliases.length > 0
    )
    const canDrag = !hasAliases
    
    return (
      <div
        ref={isDragging ? draggedRef : undefined}
        className={`mailmap-identity-card ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''} ${isCanonical ? 'canonical' : ''}`}
        draggable={canDrag}
        onDragStart={(e) => handleDragStart(e, identity)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, identity.email)}
        onDragLeave={(e) => handleDragLeave(e)}
        onDrop={(e) => handleDrop(e, identity)}
      >
        <div className="identity-avatar">
          {identity.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div className="identity-info">
          <div className="identity-name">{identity.name}</div>
          <div className="identity-email">{identity.email}</div>
        </div>
        <div className="identity-commits">
          {identity.commitCount.toLocaleString()}
        </div>
        {onRemove && (
          <button
            className="identity-remove"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            title="Remove from group"
          >
            ×
          </button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="sidebar-detail-panel mailmap-detail-panel">
        <div className="detail-loading">
          <div className="loading-spinner" />
          <span>Loading author identities...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="sidebar-detail-panel mailmap-detail-panel">
      {/* Header - matches other detail panels */}
      <div className="detail-type-badge">Mailmap</div>
      <h3 className="detail-title">Manage Author Identities</h3>
      
      <p className="mailmap-description">
        Drag users onto each other to combine identities. Changes are saved to <code>.mailmap</code> in your repository.
      </p>

      {/* Merged Identities */}
      {mergedIdentities.length > 0 && (
        <div className="mailmap-section">
          <div className="mailmap-section-header">
            <h4>Combined Identities</h4>
            <span className="mailmap-section-count">{mergedIdentities.length}</span>
          </div>
          <div className="mailmap-merged-list">
            {mergedIdentities.map((merged) => (
              <div key={`merged-${merged.canonical.email}`} className="mailmap-merged-group">
                <div className="merged-canonical" key={`canonical-${merged.canonical.email}`}>
                  {renderIdentityCard(merged.canonical, true)}
                </div>
                <div className="merged-aliases">
                  <div className="merged-aliases-label">includes:</div>
                  {merged.aliases.map((alias) => (
                    <div key={`alias-${alias.email}`} className="merged-alias">
                      {renderIdentityCard(alias, false, () => handleRemoveAlias(merged.canonical.email, alias.email))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standalone Identities */}
      <div className="mailmap-section">
        <div className="mailmap-section-header">
          <h4>All Contributors</h4>
          <span className="mailmap-section-count">{standaloneIdentities.length}</span>
        </div>
        <div className="mailmap-identity-list">
          {standaloneIdentities.map((identity) => (
            <div key={identity.email}>
              {renderIdentityCard(identity)}
            </div>
          ))}
        </div>
        {standaloneIdentities.length === 0 && (
          <div className="mailmap-empty">
            All identities have been combined
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mailmap-actions">
        <div className="mailmap-actions-hint">
          {existingMailmap.length > 0 && (
            <span className="mailmap-existing">
              .mailmap exists with {existingMailmap.length} entries
            </span>
          )}
        </div>
        <div className="mailmap-actions-buttons">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? 'Saving...' : hasChanges ? 'Save to .mailmap' : 'No Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

