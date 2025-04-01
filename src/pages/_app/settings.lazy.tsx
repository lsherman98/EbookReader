import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_app/settings')({
  component: () => <div>Hello /_app/settings!</div>,
})
