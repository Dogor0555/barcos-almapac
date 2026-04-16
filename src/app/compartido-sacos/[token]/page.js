// app/compartido-sacos/[token]/page.js
import ClientPage from './page-client'

export default async function Page({ params }) {
  // En Next.js 15+, params es una Promise que debe ser await
  const { token } = await params
  
  return <ClientPage token={token} />
}