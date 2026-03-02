'use client'

import * as React from 'react'
import ClientPage from './page-client'

export default function Page({ params }) {
  // Para componentes cliente, usamos React.use()
  const { token } = React.use(params)
  
  return <ClientPage token={token} />
}