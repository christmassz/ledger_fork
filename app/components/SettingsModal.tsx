import { useEffect, useState } from 'react'
import { loadVSCodeTheme } from '../theme'

export type ThemeMode = 'light' | 'dark' | 'custom'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  themeMode: ThemeMode
  onThemeChange: (mode: ThemeMode) => Promise<void>
}

export const SettingsModal = ({ open, onClose, themeMode, onThemeChange }: SettingsModalProps) => {
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>(themeMode)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setSelectedTheme(themeMode)
  }, [themeMode, open])

  const handleThemeChange = async (newTheme: ThemeMode) => {
    if (isSaving) return

    try {
      setIsSaving(true)
      setSelectedTheme(newTheme)
      await onThemeChange(newTheme)
    } finally {
      setIsSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Settings</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="settings-section">
            <h4 className="settings-section-title">Appearance</h4>

            <div className="settings-option-group">
              <label className="settings-radio-label">
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={selectedTheme === 'light'}
                  onChange={() => handleThemeChange('light')}
                  disabled={isSaving}
                />
                <span className="settings-radio-text">Light Theme</span>
              </label>
              <p className="settings-option-description">Bright colors optimized for daytime use</p>
            </div>

            <div className="settings-option-group">
              <label className="settings-radio-label">
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={selectedTheme === 'dark'}
                  onChange={() => handleThemeChange('dark')}
                  disabled={isSaving}
                />
                <span className="settings-radio-text">Dark Theme</span>
              </label>
              <p className="settings-option-description">Dark colors for reduced eye strain</p>
            </div>

            <div className="settings-option-group">
              <label className="settings-radio-label">
                <input
                  type="radio"
                  name="theme"
                  value="custom"
                  checked={selectedTheme === 'custom'}
                  onChange={() => handleThemeChange('custom')}
                  disabled={isSaving}
                />
                <span className="settings-radio-text">Custom Theme (VSCode)</span>
              </label>
              <p className="settings-option-description">Load a theme from a VSCode JSON file</p>
            </div>
          </div>

          <div className="settings-section">
            <p className="settings-hint">Settings are saved automatically and restored when you open Ledger</p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
