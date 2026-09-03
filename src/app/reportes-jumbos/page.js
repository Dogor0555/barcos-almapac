// src/app/reportes-jumbos/page.js
// Server component: lee el TSV mock, parsea y pasa los datos al client component.

import { loadRegistrosJumbosMock } from './parser'
import ReportesJumbosClient from './page-client'

export default function ReportesJumbosPage() {
  const registros = loadRegistrosJumbosMock()
  return <ReportesJumbosClient registros={registros} />
}
