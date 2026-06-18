# AGENTS.md

## Proposito

Este repositorio define una plataforma cuantitativa completa para trading sistematico sobre `BTCUSDT`. El agente que trabaje aqui debe pensar el sistema como un producto end-to-end que cubre datos, estrategia, validacion, alertas y ejecucion automatica.

Aunque una iteracion puntual trabaje sobre una parte concreta, el diseno global siempre debe preservarse.

## Vision del sistema

El sistema final esta compuesto por los siguientes dominios:

- `market data ingestion`
- `historical reconciliation`
- `strategy engine`
- `signal persistence`
- `telegram notifications`
- `backtesting`
- `parameter optimization`
- `out-of-sample validation`
- `paper trading`
- `live order execution`
- `risk controls`
- `auditability`

## Objetivo funcional

La plataforma debe permitir:

- recolectar y mantener historico integro de velas
- calcular senales consistentes sobre reglas configurables
- simular resultados con costos operativos
- optimizar parametros sin sobreajuste
- validar robustez estadistica
- notificar eventos relevantes
- ejecutar ordenes cuando el modo operativo lo permita

## Arquitectura objetivo

```text
src/
  data/
  database/
  strategy/
  backtesting/
  notifications/
  execution/
  repositories/
  models/
  config/
  workers/
  scripts/
  shared/
```

### Responsabilidad por capa

- `data/`: acceso a exchange, collection, reconciliation y adaptacion de market data
- `database/`: conexion SQL Server, schemas y utilidades de persistencia
- `strategy/`: indicadores, reglas y contratos de senal
- `backtesting/`: simulacion, metricas, optimizacion y validacion
- `notifications/`: Telegram y otros canales operativos
- `execution/`: integracion con exchange para paper/live trading
- `workers/`: daemons programados
- `scripts/`: tareas manuales y operativas

## Supuestos de negocio

- activo principal: `BTCUSDT`
- timeframe base: `1h`
- filtro macro: `EMA 200` diaria derivada de `1h`
- entrada inicial: correccion porcentual + `RSI` + volumen
- prioridad: robustez cuantitativa antes que frecuencia operativa

## Modos de operacion

El sistema debe soportar tres modos:

- `signal-only`
- `paper-trading`
- `live-trading`

Reglas:

- `signal-only`: genera y persiste senales, envia alertas, no envia ordenes
- `paper-trading`: simula ordenes y lifecycle operativo sin tocar el exchange
- `live-trading`: envia ordenes reales solo si existe habilitacion explicita de entorno

## Reglas de diseno

- mantener desacoplados strategy engine y execution layer
- evitar hardcoding de parametros de mercado y estrategia
- toda logica configurable debe salir de `config`
- la persistencia debe ser idempotente
- el collector y la reconciliacion deben tolerar reinicios
- los modulos de backtesting no deben depender del runtime de produccion
- todo resultado cuantitativo debe poder reproducirse
- si un cambio implementa una capacidad, tabla, flujo, modulo o comportamiento que no este reflejado en `README.md`, hay que actualizar `README.md` en la misma intervencion
- si una implementacion cambia el alcance o el contrato funcional descrito en `README.md`, no dejar la documentacion desalineada
- si se agrega o renombra una metrica, variable, score, flag o termino cuantitativo relevante, actualizar `docs/terminology.md` en la misma intervencion
- si un termino nuevo aparece en `README.md` y no es autoexplicativo, debe existir tambien en `docs/terminology.md`

## Reglas cuantitativas

Cuando se modifique estrategia, indicadores o backtesting:

- documentar formulas y supuestos
- evitar look-ahead bias
- evitar data leakage
- respetar separacion entre training y validation
- medir retorno junto con drawdown y estabilidad
- no aceptar configuraciones solo por retorno absoluto

## Reglas de ejecucion

Cuando se trabaje sobre ejecucion automatica:

- introducir un adaptador de exchange desacoplado
- permitir reemplazar Binance por otro broker sin reescribir estrategia
- registrar request, response, fills y errores
- proteger contra ordenes duplicadas
- incorporar controles de riesgo por posicion y exposicion
- requerir flag explicita para habilitar live trading

## Reglas de datos

Cuando se trabaje sobre collector o reconciliacion:

- garantizar continuidad temporal del historico
- detectar faltantes, duplicados e inconsistencias
- preservar trazabilidad de recuperacion
- preferir procesos idempotentes y auditables
- no asumir que la API externa es perfecta

## Reglas de configuracion

La configuracion esperada incluye:

- SQL Server
- Binance publica para market data
- Binance autenticada para ejecucion automatica
- parametros de estrategia
- parametros de backtesting
- credenciales Telegram
- modo operativo
- feature flags para live trading

## Tablas esperadas

Como minimo, el sistema final debe contemplar persistencia para:

- `candles`
- `candle_reconciliation_log`
- `strategy_signals`
- `backtest_runs`
- `backtest_trades`
- `optimization_runs`
- `optimization_results`
- `orders`
- `order_executions`
- `positions`

## Metricas minimas esperadas

- capital inicial
- capital final
- retorno porcentual
- cantidad de trades
- win rate
- profit factor
- average win
- average loss
- max drawdown
- best trade
- worst trade
- performance training
- performance validation
- degradacion porcentual
- estabilidad de parametros

## Prioridad de producto

El orden conceptual del producto es:

1. datos confiables
2. senales correctas
3. backtesting realista
4. optimizacion robusta
5. validacion fuera de muestra
6. paper trading
7. live trading

## Que debe preservar cualquier cambio

- separacion de responsabilidades
- trazabilidad de cada senal y trade
- facilidad para auditar decisiones
- posibilidad de ejecutar la estrategia sin acoplarla a Binance
- posibilidad de extender el sistema a nuevas estrategias

## Archivos a considerar de alto impacto

- `src/main.ts`
- `src/config/*`
- `src/data/*`
- `src/strategy/*`
- `src/backtesting/*`
- `src/notifications/*`
- `src/execution/*`
- `src/workers/*`

## Criterio general para futuras revisiones

El agente no debe pensar en este repositorio como un simple bot de alertas. Debe tratarlo como una plataforma cuantitativa con pipeline completo desde market data hasta ejecucion automatica, con enfasis en consistencia matematica, control de riesgo y auditabilidad.

Ademas, `README.md` debe mantenerse como la referencia funcional de alto nivel del sistema. Cualquier desvio relevante entre implementacion y documentacion debe corregirse durante el mismo cambio, no dejarse para despues.
