export function validarRegistro(form, paso) {
  const errores = {}
  const numeroValido = (valor) => valor !== null && valor !== undefined && String(valor).trim() !== '' && Number.isFinite(Number(valor)) && Number(valor) >= 0
  if (paso === 0) {
    if (!form.fecha) errores.fecha = 'Selecciona la fecha del turno.'
    if (!form.manto.trim()) errores.manto = 'Indica el manto.'
  }
  if (paso === 1) {
    if (!numeroValido(form.produccion_ton)) errores.produccion = 'Ingresa toneladas iguales o mayores que cero.'
    if (!numeroValido(form.indice_gasificacion_m3_ton)) errores.gasificacion = 'Ingresa un índice igual o mayor que cero.'
  }
  if (paso === 2 && !numeroValido(form.caudal_m3_s)) errores.caudal = 'Ingresa un caudal igual o mayor que cero.'
  if (paso === 3) {
    form.voladuras.forEach((v, i) => {
      if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(v.hora)) errores[`voladura-hora-${i}`] = 'Indica una hora válida.'
      if (!numeroValido(v.cantidad_kg)) errores[`voladura-kg-${i}`] = 'Ingresa kg iguales o mayores que cero.'
    })
  }
  if (paso === 4 && !form.registrado_por.trim()) errores.registrado_por = 'Indica quién registra el turno.'
  return errores
}
