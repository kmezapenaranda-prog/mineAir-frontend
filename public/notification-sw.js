self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destino = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientes) => {
      const existente = clientes.find((cliente) => new URL(cliente.url).origin === self.location.origin)
      if (existente) {
        existente.navigate(destino)
        return existente.focus()
      }
      return self.clients.openWindow(destino)
    }),
  )
})
