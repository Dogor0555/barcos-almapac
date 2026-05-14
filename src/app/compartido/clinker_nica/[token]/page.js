// compartido/clinker_nica/[token]/page.js
import * as React from 'react'
import ClientPage from './page-client'

export default function Page({ params }) {
  const { token } = React.use(params)
  return <ClientPage token={token} />
}