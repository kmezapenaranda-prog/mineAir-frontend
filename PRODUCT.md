# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

MineAIr sirve principalmente a ingenieros de ventilación y supervisores de seguridad minera. Ambos necesitan interpretar el estado atmosférico, anticipar riesgos y registrar decisiones operativas desde una sala de control o durante recorridos con conectividad intermitente.

## Product Purpose

Monitorear la atmósfera de una mina subterránea de carbón, hacer visibles las condiciones críticas y anticipar eventos de CH₄ y CO mediante modelos predictivos. El producto tiene éxito cuando el equipo identifica cambios peligrosos a tiempo, distingue datos en vivo de datos almacenados y conserva un registro operativo trazable.

## Positioning

La propuesta combina predicción mediante IA ejecutada en infraestructura local, continuidad operativa con conectividad intermitente y apoyo al cumplimiento normativo colombiano. Ninguna de esas capacidades aislada representa el producto completo: su diferencia está en integrarlas dentro del mismo flujo operacional.

## Operating Context

- Operación minera subterránea con poca luz, polvo, guantes y conectividad variable.
- Telemetría de gases, estado de sensores y repetidores, mapas de la mina, alarmas críticas y predicciones.
- Registro por turno de producción, ventilación, voladuras y responsables.
- Generación de informes para fiscalización de la Agencia Nacional de Minería.
- Nodo de borde ejecutado en el computador del ingeniero en superficie.

## Capabilities and Constraints

- Monitorea O₂, CH₄, CO₂, CO y H₂S según el tipo de nodo.
- La predicción v1 se limita a CH₄ y CO; O₂ permanece bajo control reactivo.
- Diferencia niveles normal, precaución, alarma y sin monitorear.
- Funciona como PWA y conserva determinadas operaciones locales cuando no hay red.
- Los datos cacheados no deben presentarse como telemetría vigente.
- Los umbrales y recomendaciones deben conservar trazabilidad normativa y no afirmar capacidades que los sensores no tienen.
- Parte del hardware está comprado pero pendiente de entrega; los datos actuales incluyen simulación explícita.

## Brand Commitments

- Nombre: MineAIr.
- Metáfora rectora: **Faro de seguridad**.
- Voz: técnica, precisa y directa; debe informar sin dramatizar ni minimizar riesgos.
- Identidad visual existente: isotipo y lockup en `public/icons/isotipo-mineair.svg` y componentes de `src/components/brand/`.

## Evidence on Hand

- Contrato compartido y criterios del producto: `MINEAIR-SHARED.md`.
- Schemas de telemetría, predicción y variables operativas en la raíz del proyecto.
- Pruebas automatizadas sobre umbrales, alarmas, predicciones, datos simulados y DXF en `tests/`.
- Configuración normativa y recomendaciones trazables en `src/config/`.
- No hay testimonios, métricas de clientes ni validaciones comerciales documentadas; no deben fabricarse.

## Product Principles

1. **El dato seguro es un dato contextualizado.** Siempre distinguir vigencia, conexión, procedencia y estado del sensor.
2. **Predecir complementa, no reemplaza, la reacción operacional.** Las recomendaciones deben conservar límites y trazabilidad.
3. **La operación continúa con conectividad imperfecta.** Las funciones locales deben degradarse de forma explícita y segura.
4. **La información crítica se reconoce a distancia.** Estado, jerarquía y acciones deben sobrevivir poca luz, polvo y uso con guantes.
5. **Toda decisión importante deja rastro.** Informes y registros deben poder explicarse y revisarse.

## Accessibility & Inclusion

El producto debe alcanzar WCAG 2.2 AA. Todos los flujos deben funcionar con teclado, foco visible y lectores de pantalla. Los objetivos táctiles mínimos son de 44 × 44 px y el movimiento reducido debe conservar la comprensión de los cambios de estado.
