import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_app/library')({
  component: Index,
})

function Index() {
  return (
    <h1 className="mb-16 mt-8 text-center bg-gradient-to-b from-pink-900 via-pink-800 to-pink-400 bg-clip-text text-transparent text-5xl font-extrabold">
      Library
    </h1>
  )
}
