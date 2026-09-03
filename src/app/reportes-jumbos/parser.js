// src/app/reportes-jumbos/parser.js
// Parsea el TSV con los registros de jumbos y expone un array de objetos normalizado.

import fs from 'node:fs'
import path from 'node:path'

let cache = null

function parseFechaHoraDDMMYYYY(s) {
  if (!s) return null
  const [fecha, hora] = s.split(' ')
  if (!fecha) return null
  const [d, m, y] = fecha.split('/').map(Number)
  const [hh, mm] = (hora || '0:0').split(':').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0)
}

function parseFecha(s) {
  if (!s) return null
  const [d, m, y] = s.split('/').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function parseRegistrosJumbosTSV(tsv) {
  return tsv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('\t')
      const [
        titulo,
        fecha,
        barco,
        bodega,
        placa_camion,
        placa_remolque,
        hora_inicio,
        hora_fin,
        producto,
        cbe,
        cd,
        unidad,
        peso,
        tipo,
      ] = parts

      const fechaDate = parseFecha(fecha)
      const inicioDate = parseFechaHoraDDMMYYYY(hora_inicio)
      const finDate = parseFechaHoraDDMMYYYY(hora_fin)

      const cantidadBuenEstado = parseInt(cbe, 10) || 0
      const cantidadDanado = parseInt(cd, 10) || 0
      const pesoNetoKg = parseInt(String(peso).replace(/\./g, ''), 10) || 0

      const duracionMin =
        inicioDate && finDate ? Math.max(0, Math.round((finDate - inicioDate) / 60000)) : 0

      return {
        titulo: titulo?.trim(),
        fecha: fecha?.trim(),
        fechaDate,
        barco: barco?.trim(),
        bodega: bodega?.trim(),
        placaCamion: placa_camion?.trim(),
        placaRemolque: placa_remolque?.trim(),
        horaInicio: hora_inicio?.trim(),
        horaFin: hora_fin?.trim(),
        inicioDate,
        finDate,
        duracionMin,
        producto: producto?.trim(),
        cantidadBuenEstado,
        cantidadDanado,
        cantidadTotal: cantidadBuenEstado + cantidadDanado,
        unidadMedida: unidad?.trim(),
        pesoNetoKg,
        tipoElemento: tipo?.trim(),
      }
    })
}

export function loadRegistrosJumbosMock() {
  if (cache) return cache
  const file = path.join(process.cwd(), 'src', 'app', 'reportes-jumbos', 'mock-data.tsv')
  const tsv = fs.readFileSync(file, 'utf8')
  cache = parseRegistrosJumbosTSV(tsv)
  return cache
}
