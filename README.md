# TradingBot

Plataforma backend para análisis cuantitativo, generación de señales, backtesting, optimización de parámetros y ejecución automática de estrategias sobre `BTCUSDT`, construida con `Node.js`, `TypeScript` y `Microsoft SQL Server`.

El sistema fue diseñado para cubrir el ciclo completo de una estrategia sistemática:

- adquisición y persistencia de market data
- validación de integridad histórica
- cálculo de indicadores y señales
- simulación y evaluación estadística
- optimización y validación fuera de muestra
- notificaciones operativas
- ejecución automática de órdenes en una etapa productiva

## Objetivo

TradingBot no se basa en intuición discrecional ni en predicción aislada de precio. Su objetivo es operar como un sistema cuantitativo reproducible, donde cada señal, trade y métrica pueda trazarse y validarse con datos históricos y reglas configurables.

El sistema permite:

- almacenar histórico OHLCV de Bitcoin
- construir datasets consistentes para análisis técnico
- ejecutar estrategias modulares desacopladas del origen de datos
- simular operaciones bajo supuestos realistas
- medir retorno, riesgo y estabilidad
- optimizar parámetros sin contaminar datasets
- generar alertas operativas
- ejecutar órdenes automáticas sobre exchange cuando el modo de operación lo habilita

## Stack

- Runtime: `Node.js`
- Lenguaje: `TypeScript`
- Persistencia: `Microsoft SQL Server`
- Exchange market data: `Binance public API`
- Notificaciones: `Telegram Bot API`
- Scheduling: daemons nativos de Node.js

## Capacidades del sistema

### 1. Market Data Collector

Responsabilidad:

- consumir datos de mercado desde Binance
- obtener velas OHLCV de `BTCUSDT`
- persistir histórico en SQL Server
- evitar duplicados
- reanudar correctamente después de reinicios
- mantener continuidad temporal del dataset base

Timeframe base:

- `1h`

Tabla principal:

- `candles`

Campos:

- `id`
- `symbol`
- `timeframe`
- `open_time`
- `open`
- `high`
- `low`
- `close`
- `volume`
- `created_at`

El collector corre como daemon y garantiza idempotencia en la ingesta.

### 2. Candle Reconciliation

Proceso independiente orientado a asegurar integridad histórica.

Responsabilidad:

- detectar velas faltantes
- detectar duplicados
- detectar velas incompletas o inconsistentes
- validar continuidad temporal
- recuperar datos faltantes desde el exchange
- auditar cada ejecución

Frecuencia:

- una vez por día de forma automática

Tabla de auditoría:

- `candle_reconciliation_log`

Campos:

- `id`
- `execution_date`
- `symbol`
- `timeframe`
- `process_status`
- `candles_checked`
- `candles_missing`
- `candles_recovered`
- `errors`
- `details`
- `created_at`

### 3. Strategy Engine

Motor de estrategia desacoplado del collector, del backtester y del ejecutor de órdenes.

Responsabilidad:

- recibir series históricas
- calcular indicadores
- evaluar reglas de entrada y salida
- generar señales estructuradas

Primera estrategia híbrida:

- filtro de tendencia: `EMA 200` diaria calculada desde velas de `1h`
- condición de caída porcentual desde máximo reciente
- condición de sobreventa por `RSI 14`
- confirmación por volumen relativo

Regla base:

- solo buscar compras si `precio actual > EMA200 diaria`

Evento emitido:

```json
{
  "type": "BUY_SIGNAL",
  "symbol": "BTCUSDT",
  "price": 92000,
  "indicators": {
    "rsi": 31,
    "ema200": 85000,
    "dropPercent": 8.4,
    "volumeRatio": 1.25
  },
  "timestamp": "2026-06-14T10:00:00.000Z"
}
```

### 4. Notifications

Cuando se genera una señal válida, el sistema envía una alerta a Telegram con contexto operativo suficiente para revisión humana.

Contenido esperado:

- símbolo
- precio actual
- caída porcentual
- RSI
- EMA200
- razón de la señal
- parámetros activos
- timestamp

Ejemplo:

```text
BTC BUY SIGNAL

Precio: 92000 USD
Caída: -8.4%
RSI: 31
EMA200: 85000
Motivos:
- Tendencia alcista
- Sobreventa
- Corrección fuerte
```

### 5. Backtesting

Módulo independiente para ejecutar la estrategia sobre histórico persistido en SQL Server.

Responsabilidad:

- simular entradas y salidas
- modelar capital inicial
- aplicar tamaño de posición
- descontar comisión
- aplicar slippage
- respetar take profit y stop loss
- registrar trades simulados

Cada trade almacenado contiene:

- timestamp de entrada
- precio de entrada
- timestamp de salida
- precio de salida
- resultado
- ganancia o pérdida
- motivo de salida

Métricas principales:

- capital inicial
- capital final
- retorno porcentual
- cantidad de operaciones
- win rate
- profit factor
- ganancia promedio
- pérdida promedio
- máximo drawdown
- mejor operación
- peor operación

### 6. Parameter Optimizer

Módulo para probar múltiples configuraciones de la estrategia de forma sistemática.

Responsabilidad:

- ejecutar grids de parámetros
- rankear configuraciones
- comparar retorno vs riesgo
- priorizar robustez por encima de ganancia bruta

Parámetros típicos:

- `dropPercent`
- `rsiLimit`
- `volumeMultiplier`
- `takeProfitPercent`
- `stopLossPercent`

La salida del optimizador incluye ranking, métricas comparativas y score compuesto de robustez.

### 7. Robust Validation

El sistema incorpora separación entre datasets de entrenamiento y validación para reducir sobreajuste.

Proceso:

1. optimizar parámetros solo sobre `training`
2. evaluar la mejor configuración sobre `validation`
3. medir degradación de performance
4. detectar señales de overfitting

Métricas adicionales:

- diferencia entre retorno de training y validation
- degradación porcentual
- estabilidad de parámetros
- estabilidad de cantidad de trades
- estabilidad de drawdown

El criterio de aceptación no es “máximo retorno”, sino consistencia ajustada por riesgo.

### 8. Order Execution Layer

La arquitectura contempla una capa de ejecución desacoplada del strategy engine.

Responsabilidad:

- recibir señales validadas
- traducirlas a órdenes
- controlar modo de operación
- registrar órdenes enviadas
- seguir estado de ejecución
- administrar riesgo operativo

Modos de operación:

- `signal-only`
- `paper-trading`
- `live-trading`

Capacidades de la capa de ejecución:

- creación de órdenes de mercado o límite
- control de tamaño de posición
- stop loss y take profit automáticos
- protección ante órdenes duplicadas
- logging de request/response con exchange
- trazabilidad completa por trade

La decisión de operar en vivo depende de métricas históricas, controles de riesgo y habilitación explícita de entorno.

## Arquitectura

```text
src/
  data/
    collector.service.ts
    binance.client.ts
    reconciliation.service.ts
  database/
    sql.service.ts
    schemas/
  strategy/
    indicators.ts
    hybrid.strategy.ts
  backtesting/
    engine.ts
    simulator.ts
    optimizer.ts
    validator.ts
  notifications/
    telegram.service.ts
  execution/
    order-executor.service.ts
    exchange-adapter.ts
    risk-manager.ts
  repositories/
  models/
  config/
  workers/
  scripts/
  shared/
```

## Flujo operativo

### Flujo de datos

1. el collector obtiene velas nuevas
2. las velas se almacenan en SQL Server
3. la reconciliación diaria corrige gaps e inconsistencias
4. el strategy engine consume histórico consolidado
5. se genera una señal
6. la señal se persiste y se notifica
7. según el modo operativo, la señal puede derivar en paper trade o live order

### Flujo cuantitativo

1. se ejecuta backtesting sobre histórico real
2. se calculan métricas de retorno y riesgo
3. el optimizador prueba configuraciones
4. se valida fuera de muestra
5. solo las configuraciones robustas pasan a operación

## Configuración

Toda la configuración del sistema se resuelve por variables de entorno y configuración tipada.

Ejemplo:

```env
SQL_SERVER=
SQL_DATABASE=
SQL_USER=
SQL_PASSWORD=
SQL_PORT=

BINANCE_URL=
BINANCE_API_KEY=
BINANCE_API_SECRET=

SYMBOL=BTCUSDT
TIMEFRAME=1h

STRATEGY_DROP_PERCENT=8
STRATEGY_RSI_LIMIT=35
STRATEGY_VOLUME_MULTIPLIER=1
STRATEGY_TAKE_PROFIT_PERCENT=5
STRATEGY_STOP_LOSS_PERCENT=3

BACKTEST_INITIAL_CAPITAL=10000
BACKTEST_POSITION_SIZE_PERCENT=10
BACKTEST_COMMISSION_PERCENT=0.1
BACKTEST_SLIPPAGE_PERCENT=0.05

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

TRADING_MODE=signal-only
LIVE_TRADING_ENABLED=false
```

## Scripts operativos

```bash
npm start
npm run backfill-history
npm run reconciliation
npm run test-market-data
npm run test-strategy
npm run backtest
npm run optimize
npm run validate-strategy
npm run paper-trading
npm run live-trading
```

## Diseño técnico

Principios aplicados:

- separación estricta entre datos, estrategia, simulación y ejecución
- configurabilidad por entorno
- idempotencia en persistencia
- trazabilidad completa de señales, trades y órdenes
- preparación para evolución gradual desde análisis a automatización

El strategy engine puede cambiarse sin tocar collector, reconciliación, backtester ni ejecutor.

## Métricas de aceptación

Una estrategia se considera apta para producción cuando:

- muestra retorno consistente en training y validation
- mantiene drawdown controlado
- no depende de un único parámetro extremo
- tiene cantidad razonable de operaciones
- soporta costos operativos reales
- conserva trazabilidad y reproducibilidad total

## Roadmap natural de madurez

- `Fase 1`: data collection e integridad histórica
- `Fase 2`: señales y alertas
- `Fase 3`: backtesting y simulación robusta
- `Fase 4`: optimización y validación estadística
- `Fase 5`: paper trading
- `Fase 6`: live trading con controles de riesgo

