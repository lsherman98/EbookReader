import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_app/reader')({
  component: Index,
})

function Index() {
  return (
    <></>
  )
}
