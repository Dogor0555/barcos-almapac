import { use } from 'react'
import ClientPage from './page-client'

export default function Page({ params }) {
  // Desempaquetamos los params asíncronos
  const { token } = use(params)
  
  return <ClientPage token={token} />
}