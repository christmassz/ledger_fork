import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Titlebar, TitlebarProps } from './Titlebar'
import { TitlebarContextProvider } from './TitlebarContext'
import type { ChannelReturn } from '@/lib/conveyor/schemas'
import { useConveyor } from '@/app/hooks/use-conveyor'

type WindowInitProps = ChannelReturn<'window-init'>

interface WindowContextProps {
  titlebar: TitlebarProps
  readonly window: WindowInitProps | undefined
  setTitle: (title: string) => void
  titlebarActions: ReactNode
  setTitlebarActions: (actions: ReactNode) => void
}

const WindowContext = createContext<WindowContextProps | undefined>(undefined)

export const WindowContextProvider = ({
  children,
  titlebar: initialTitlebar = {
    title: 'Ledger Source Control',
    icon: 'appIcon.png',
    titleCentered: false,
    menuItems: [],
  },
}: {
  children: React.ReactNode
  titlebar?: TitlebarProps
}) => {
  const [initProps, setInitProps] = useState<WindowInitProps>()
  const [title, setTitle] = useState(initialTitlebar.title)
  const [titlebarActions, setTitlebarActions] = useState<ReactNode>(null)
  const { windowInit } = useConveyor('window')

  useEffect(() => {
    windowInit().then(setInitProps)

    // Add class to parent element
    const parent = document.querySelector('.window-content')?.parentElement
    parent?.classList.add('window-frame')
  }, [windowInit])

  const windowProps = initProps || { platform: 'darwin' } as WindowInitProps
  const titlebar = { ...initialTitlebar, title }

  return (
    <WindowContext.Provider value={{ titlebar, window: windowProps, setTitle, titlebarActions, setTitlebarActions }}>
      <TitlebarContextProvider>
        <Titlebar />
      </TitlebarContextProvider>
      <div className="window-content">{children}</div>
    </WindowContext.Provider>
  )
}

export const useWindowContext = () => {
  const context = useContext(WindowContext)
  if (!context) {
    throw new Error('useWindowContext must be used within a WindowContextProvider')
  }
  return context
}
