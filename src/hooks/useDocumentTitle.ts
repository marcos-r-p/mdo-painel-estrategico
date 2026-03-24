import { useEffect } from 'react'

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title
    document.title = `${title} | MdO Painel`
    return () => { document.title = prev }
  }, [title])
}
