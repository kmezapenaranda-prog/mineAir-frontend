/** Reglas preventivas trazables al Decreto 1886 de 2015, texto consolidado. */
export function recomendacionNormativa({ gas, nivel, ubicacion, umbral }) {
  if (gas === 'ch4') {
    if (nivel === 'alarma') return `Verifique de inmediato el CH₄ en ${ubicacion} con un equipo calibrado y revise el circuito de ventilación. Si la medición real alcanza el límite aplicable al sitio, suspenda los trabajos y evacúe; el reingreso solo procede después de diluir el metano por debajo del límite, bajo coordinación del supervisor de turno. Decreto 1886 de 2015, arts. 46, 52 y 53.`
    if (nivel === 'precaucion') return `Aumente la frecuencia de verificación de CH₄ en ${ubicacion}, confirme la lectura con equipo calibrado y revise el circuito de ventilación y sus registros. Prepare la aplicación del procedimiento de suspensión si la medición real alcanza el límite del artículo 53. Decreto 1886 de 2015, arts. 46, 52 y 53.`
    return `Mantenga las mediciones de CH₄, las pruebas de verificación y los registros del tablero de control de gases en ${ubicacion}. Decreto 1886 de 2015, arts. 46, 51 y 52.`
  }
  if (nivel === 'alarma') return `Verifique de inmediato el CO en ${ubicacion} con un equipo calibrado, inspeccione posibles fuentes de combustión o incendio y evalúe las condiciones de ventilación. Si la evaluación de exposición confirma un valor superior al TLV-TWA de ${umbral} ppm, o existe peligro que no pueda controlarse o aislarse, el responsable técnico debe impedir el ingreso o suspender el trabajo conforme al SG-SST. Decreto 1886 de 2015, arts. 13, 39, 46 y 52.`
  if (nivel === 'precaucion') return `Confirme el CO en ${ubicacion} con un equipo calibrado, revise posibles fuentes de combustión y ventilación, y deje registro de la medición. El valor límite TLV-TWA aplicable es ${umbral} ppm. Decreto 1886 de 2015, arts. 39, 46 y 52.`
  return `Mantenga el monitoreo y registro de CO en ${ubicacion}; verifique periódicamente los equipos de medición. Decreto 1886 de 2015, arts. 46, 51 y 52.`
}
