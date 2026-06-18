# AGENTS.md

## Propósito

Este repositorio define una plataforma cuantitativa completa para trading sistemático sobre `BTCUSDT`. El agente que trabaje aquí debe pensar el sistema como un producto end-to-end que cubre datos, estrategia, validación, alertas y ejecución automática.

Aunque una iteración puntual trabaje sobre una parte concreta, el diseño global siempre debe preservarse.

## Visión del sistema

El sistema final está compuesto por los siguientes dominios:

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

- recolectar y mantener histórico íntegro de velas
- calcular señales consistentes sobre reglas configurables
- simular resultados con costos operativos
- optimizar parámetros sin sobreajuste
- validar robustez estadística
- notificar eventos relevantes
- ejecutar órdenes cuando el modo operativo lo permita

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

- `data/`: acceso a exchange, collection, reconciliation y adaptación de market data
- `database/`: conexión SQL Server, schemas y utilidades de persistencia
- `strategy/`: indicadores, reglas y contratos de señal
- `backtesting/`: simulación, métricas, optimización y validación
- `notifications/`: Telegram y otros canales operativos
- `execution/`: integración con exchange para paper/live trading
- `workers/`: daemons programados
- `scripts/`: tareas manuales y operativas

## Supuestos de negocio

- activo principal: `BTCUSDT`
- timeframe base: `1h`
- filtro macro: `EMA 200` diaria derivada de `1h`
- entrada inicial: corrección porcentual + `RSI` + volumen
- prioridad: robustez cuantitativa antes que frecuencia operativa

## Modos de operación

El sistema debe soportar tres modos:

- `signal-only`
- `paper-trading`
- `live-trading`

Reglas:

- `signal-only`: genera y persiste señales, envía alertas, no envía órdenes
- `paper-trading`: simula órdenes y lifecycle operativo sin tocar el exchange
- `live-trading`: envía órdenes reales solo si existe habilitación explícita de entorno

## Reglas de diseño

- mantener desacoplados strategy engine y execution layer
- evitar hardcoding de parámetros de mercado y estrategia
- toda lógica configurable debe salir de `config`
- la persistencia debe ser idempotente
- el collector y la reconciliación deben tolerar reinicios
- los módulos de backtesting no deben depender del runtime de producción
- todo resultado cuantitativo debe poder reproducirse

## Reglas cuantitativas

Cuando se modifique estrategia, indicadores o backtesting:

- documentar fórmulas y supuestos
- evitar look-ahead bias
- evitar data leakage
- respetar separación entre training y validation
- medir retorno junto con drawdown y estabilidad
- no aceptar configuraciones solo por retorno absoluto

## Reglas de ejecución

Cuando se trabaje sobre ejecución automática:

- introducir un adaptador de exchange desacoplado
- permitir reemplazar Binance por otro broker sin reescribir estrategia
- registrar request, response, fills y errores
- proteger contra órdenes duplicadas
- incorporar controles de riesgo por posición y exposición
- requerir flag explícita para habilitar live trading

## Reglas de datos

Cuando se trabaje sobre collector o reconciliación:

- garantizar continuidad temporal del histórico
- detectar faltantes, duplicados e inconsistencias
- preservar trazabilidad de recuperación
- preferir procesos idempotentes y auditables
- no asumir que la API externa es perfecta

## Reglas de configuración

La configuración esperada incluye:

- SQL Server
- Binance pública para market data
- Binance autenticada para ejecución automática
- parámetros de estrategia
- parámetros de backtesting
- credenciales Telegram
- modo operativo
- feature flags para live trading

## Tablas esperadas

Como mínimo, el sistema final debe contemplar persistencia para:

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

## Métricas mínimas esperadas

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
- degradación porcentual
- estabilidad de parámetros

## Prioridad de producto

El orden conceptual del producto es:

1. datos confiables
2. señales correctas
3. backtesting realista
4. optimización robusta
5. validación fuera de muestra
6. paper trading
7. live trading

## Qué debe preservar cualquier cambio

- separación de responsabilidades
- trazabilidad de cada señal y trade
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

El agente no debe pensar en este repositorio como un simple bot de alertas. Debe tratarlo como una plataforma cuantitativa con pipeline completo desde market data hasta ejecución automática, con énfasis en consistencia matemática, control de riesgo y auditabilidad.
