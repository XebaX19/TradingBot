# TradingBot

Plataforma backend para analisis cuantitativo, generacion de senales, backtesting, optimizacion de parametros y ejecucion automatica de estrategias sobre `BTCUSDT`, construida con `Node.js`, `TypeScript` y `Microsoft SQL Server`.

El sistema fue disenado para cubrir el ciclo completo de una estrategia sistematica:

- adquisicion y persistencia de market data
- validacion de integridad historica
- calculo de indicadores y senales
- simulacion y evaluacion estadistica
- optimizacion y validacion fuera de muestra
- notificaciones operativas
- ejecucion automatica de ordenes en una etapa productiva

## Objetivo

TradingBot no se basa en intuicion discrecional ni en prediccion aislada de precio. Su objetivo es operar como un sistema cuantitativo reproducible, donde cada senal, trade y metrica pueda trazarse y validarse con datos historicos y reglas configurables.

El sistema permite:

- almacenar historico OHLCV de Bitcoin
- construir datasets consistentes para analisis tecnico
- ejecutar estrategias modulares desacopladas del origen de datos
- simular operaciones bajo supuestos realistas
- medir retorno, riesgo y estabilidad
- optimizar parametros sin contaminar datasets
- generar alertas operativas
- ejecutar ordenes automaticas sobre exchange cuando el modo de operacion lo habilita

## Stack

- Runtime: `Node.js`
- Lenguaje: `TypeScript`
- Persistencia: `Microsoft SQL Server`
- Exchange market data: `Binance public API`
- Notificaciones: `Telegram Bot API`
- Scheduling: daemons nativos de Node.js

## Glosario rapido

Referencia completa:

- ver [docs/terminology.md](/c:/Users/sebab/Documents/Pruebas%20NodeJS/TradingBot/docs/terminology.md)

Terminos clave:

- `EMA200`: media movil exponencial de 200 periodos. En esta estrategia actua como filtro de tendencia macro.
- `RSI`: indicador de momentum que mide sobrecompra o sobreventa. En esta estrategia se usa para detectar agotamiento bajista.
- `dropPercent`: porcentaje de caida del precio actual respecto del maximo reciente observado.
- `volumeMultiplier`: relacion minima entre el volumen actual y el volumen promedio historico usado como confirmacion.
- `profitFactor`: ganancias brutas divididas por perdidas brutas. Mayor a `1` implica sistema rentable antes de otros filtros.
- `expectancy`: resultado promedio esperado por trade.
- `maxDrawdown`: peor caida porcentual desde un pico de equity hasta el valle posterior.
- `MFE`: maxima excursion favorable de un trade antes de cerrarse.
- `MAE`: maxima excursion adversa de un trade antes de cerrarse.
- `training`: tramo historico usado para ajustar y optimizar parametros.
- `validation`: tramo historico fuera de muestra usado para comprobar si la estrategia conserva comportamiento.
- `walk-forward`: validacion repetida en multiples ventanas cronologicas para evitar depender de un solo split.
- `overfitting`: situacion donde una configuracion luce muy buena en training pero se degrada al evaluarla fuera de muestra.
- `consistencyScore`: score agregado de consistencia entre training y validation.
- `robustnessFlags`: señales explicitas que indican fragilidad estadistica, degradacion excesiva o sobreajuste.

## Capacidades del sistema

### 1. Market Data Collector

Responsabilidad:

- consumir datos de mercado desde Binance
- obtener velas OHLCV de `BTCUSDT`
- persistir historico en SQL Server
- evitar duplicados
- reanudar correctamente despues de reinicios
- mantener continuidad temporal del dataset base
- recuperar automaticamente velas faltantes si el proceso estuvo caido varias horas

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

Proceso independiente orientado a asegurar integridad historica.

Responsabilidad:

- detectar velas faltantes
- detectar duplicados
- detectar velas incompletas o inconsistentes
- validar continuidad temporal
- recuperar datos faltantes desde el exchange
- auditar cada ejecucion

Criterio operativo:

- si se detecta un gap dentro de un dia, la reconciliacion revalida el dia completo afectado, no solo la hora faltante

Frecuencia:

- una vez por dia de forma automatica

Tabla de auditoria:

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

Motor de estrategia desacoplado del collector, del backtester y del ejecutor de ordenes.

Responsabilidad:

- recibir series historicas
- calcular indicadores
- evaluar reglas de entrada y salida
- generar senales estructuradas

Primera estrategia hibrida:

- filtro de tendencia: `EMA 200` diaria calculada desde velas de `1h`
- condicion de caida porcentual desde maximo reciente
- condicion de sobreventa por `RSI 14`
- confirmacion por volumen relativo

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

Cuando se genera una senal valida, el sistema envia una alerta a Telegram con contexto operativo suficiente para revision humana.

Contenido esperado:

- simbolo
- precio actual
- caida porcentual
- RSI
- EMA200
- razon de la senal
- parametros activos
- timestamp

Ejemplo:

```text
BTC BUY SIGNAL

Precio: 92000 USD
Caida: -8.4%
RSI: 31
EMA200: 85000
Motivos:
- Tendencia alcista
- Sobreventa
- Correccion fuerte
```

### 5. Backtesting

Modulo independiente para ejecutar la estrategia sobre historico persistido en SQL Server.

Responsabilidad:

- simular entradas y salidas
- modelar capital inicial
- aplicar tamano de posicion
- descontar comision
- aplicar slippage
- respetar min notional y step size de cantidad
- respetar take profit y stop loss
- construir curva de equity
- registrar trades simulados
- persistir corridas de backtest

Arquitectura interna del backtesting:

- `backtest.engine`: recorre velas, evalua senales y genera trades
- `backtest-data-validator.service`: aborta corridas sobre datasets con gaps o velas invalidas
- `trade.simulator`: modela ejecucion, comisiones, slippage y salida
- `backtest-metrics.service`: consolida metricas y drawdown
- `backtest.service`: orquesta la corrida cuantitativa
- `backtest.repository`: persiste corridas y operaciones simuladas
- `walk-forward.service`: ejecuta multiples ventanas training/validation secuenciales

Cada trade almacenado contiene:

- timestamp de entrada
- precio de entrada
- timestamp de salida
- precio de salida
- cantidad ejecutada
- resultado
- ganancia o perdida
- fees pagados
- motivo de salida
- equity antes y despues del trade
- holding time
- MFE y MAE por trade

Tablas de backtesting:

- `backtest_runs`
- `backtest_trades`

Metricas principales:

- capital inicial
- capital final
- retorno porcentual
- cantidad de operaciones
- win rate
- profit factor
- ganancia promedio
- perdida promedio
- expectancy
- average holding hours
- exposure time
- maximo drawdown
- mejor operacion
- peor operacion
- curva de equity realizada
- drawdown flotante conservador intratrade

Validaciones previas al backtest:

- continuidad temporal del rango
- ausencia de duplicados
- consistencia OHLC
- volumen no negativo
- suficiente historico para warmup

### 6. Parameter Optimizer

Modulo para probar multiples configuraciones de la estrategia de forma sistematica.

Responsabilidad:

- ejecutar grids de parametros
- rankear configuraciones
- comparar retorno vs riesgo
- priorizar robustez por encima de ganancia bruta

Parametros tipicos:

- `dropPercent`
- `rsiLimit`
- `volumeMultiplier`
- `takeProfitPercent`
- `stopLossPercent`

La salida del optimizador incluye ranking, metricas comparativas y score compuesto de robustez.

Senales cuantitativas consideradas en el ranking:

- retorno de validation ajustado por drawdown
- degradacion de retorno entre training y validation
- degradacion de profit factor y expectancy
- estabilidad de cantidad de trades
- consistencia del perfil riesgo/retorno
- estabilidad local de parametros dentro del grid

Persistencia de optimizacion:

- `optimization_runs`
- `optimization_results`

### 7. Robust Validation

El sistema incorpora separacion entre datasets de entrenamiento y validacion para reducir sobreajuste.

Proceso:

1. optimizar parametros solo sobre `training`
2. evaluar la mejor configuracion sobre `validation`
3. medir degradacion de performance
4. detectar senales de overfitting

Metricas adicionales:

- diferencia entre retorno de training y validation
- degradacion porcentual
- estabilidad de parametros
- estabilidad de cantidad de trades
- estabilidad de drawdown
- degradacion de profit factor
- degradacion de expectancy
- consistency score
- flags explicitos de robustez o fragilidad

El criterio de aceptacion no es "maximo retorno", sino consistencia ajustada por riesgo.

Ademas del split simple, el sistema soporta `walk-forward analysis` sobre multiples ventanas temporales para validar estabilidad fuera de muestra en distintos periodos del mercado.

El resumen walk-forward informa:

- retorno promedio de validation
- drawdown promedio de validation
- consistency score promedio
- degradacion promedio entre training y validation
- porcentaje de ventanas robustas
- dispersion de parametros ganadores
- clasificacion global: `ROBUST`, `MIXED` o `WEAK`

### 8. Order Execution Layer

La arquitectura contempla una capa de ejecucion desacoplada del strategy engine.

Responsabilidad:

- recibir senales validadas
- traducirlas a ordenes
- controlar modo de operacion
- registrar ordenes enviadas
- seguir estado de ejecucion
- administrar riesgo operativo

Modos de operacion:

- `signal-only`
- `paper-trading`
- `live-trading`

Capacidades de la capa de ejecucion:

- creacion de ordenes de mercado o limite
- control de tamano de posicion
- stop loss y take profit automaticos
- proteccion ante ordenes duplicadas
- logging de request/response con exchange
- trazabilidad completa por trade

Persistencia operativa:

- `orders`
- `order_executions`
- `positions`

La decision de operar en vivo depende de metricas historicas, controles de riesgo y habilitacion explicita de entorno.

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
    backtest.engine.ts
    backtest-metrics.service.ts
    backtest.service.ts
    trade.simulator.ts
    strategy-optimizer.service.ts
    strategy-validator.service.ts
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
3. la reconciliacion diaria corrige gaps e inconsistencias
4. el strategy engine consume historico consolidado
5. se genera una senal
6. la senal se persiste y se notifica
7. segun el modo operativo, la senal puede derivar en paper trade o live order

### Flujo cuantitativo

1. se ejecuta backtesting sobre historico real
2. se generan trades simulados y curva de equity
3. se calculan metricas de retorno y riesgo
4. el optimizador prueba configuraciones
5. se valida fuera de muestra
6. solo las configuraciones robustas pasan a operacion

## Configuracion

Toda la configuracion del sistema se resuelve por variables de entorno y configuracion tipada.

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
STRATEGY_RSI_PERIOD=14
STRATEGY_RSI_LIMIT=35
STRATEGY_VOLUME_MULTIPLIER=1
STRATEGY_VOLUME_LOOKBACK_CANDLES=20
STRATEGY_RECENT_HIGH_LOOKBACK_CANDLES=168
STRATEGY_TAKE_PROFIT_PERCENT=5
STRATEGY_STOP_LOSS_PERCENT=3
STRATEGY_MAX_HOLDING_CANDLES=720

BACKTEST_INITIAL_CAPITAL=10000
BACKTEST_POSITION_SIZE_PERCENT=10
BACKTEST_COMMISSION_PERCENT=0.1
BACKTEST_SLIPPAGE_PERCENT=0.05
BACKTEST_MIN_TRADE_NOTIONAL=10
BACKTEST_QUANTITY_STEP=0.00001

PAPER_TRADING_CAPITAL=10000
PAPER_POSITION_SIZE_PERCENT=10
LIVE_TRADING_CAPITAL=10000
LIVE_POSITION_SIZE_PERCENT=5

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
npm run test-backtest-core
npm run backtest
npm run optimize
npm run optimize-strategy
npm run validate-strategy
npm run walk-forward
npm run paper-trading
npm run live-trading
```

### Ejemplos de ejecucion

Backtest simple sobre un rango historico:

```bash
npm run backtest -- --from=2020-01-01T00:00:00.000Z --to=2024-12-31T23:00:00.000Z
```

Validacion de la configuracion activa con split `70/30`:

```bash
npm run validate-strategy -- --from=2020-01-01T00:00:00.000Z --to=2024-12-31T23:00:00.000Z --splitRatio=0.7
```

Optimizacion de parametros con grilla explicita:

```bash
npm run optimize-strategy -- --from=2020-01-01T00:00:00.000Z --to=2024-12-31T23:00:00.000Z --splitRatio=0.7 --drop=5,7,8,10,12 --rsi=25,30,35 --volume=1,1.2 --tp=3,5,8 --sl=2,3,5 --top=5
```

Walk-forward sobre multiples ventanas:

```bash
npm run walk-forward -- --from=2020-01-01T00:00:00.000Z --to=2024-12-31T23:00:00.000Z --trainDays=730 --validationDays=180 --stepDays=90 --drop=5,7,8,10,12 --rsi=25,30,35 --volume=1,1.2 --tp=3,5,8 --sl=2,3,5
```

Backfill historico para una ventana acotada:

```bash
npm run backfill-history -- --from=2024-01-01 --to=2024-03-31 --delayMs=1000
```

Reconciliacion manual para un rango:

```bash
npm run reconciliation -- --from=2026-06-01 --to=2026-06-10
```

Notas:

- en los scripts que usan `--from` y `--to` con backtesting conviene usar timestamps UTC completos
- `validate-strategy` usa la configuracion activa de `env.strategy`
- `optimize` permite sobrescribir la grilla por linea de comandos y persiste ranking si la base tiene los schemas de optimizacion

## Diseno tecnico

Principios aplicados:

- separacion estricta entre datos, estrategia, simulacion y ejecucion
- configurabilidad por entorno
- idempotencia en persistencia
- trazabilidad completa de senales, trades y ordenes
- preparacion para evolucion gradual desde analisis a automatizacion

El strategy engine puede cambiarse sin tocar collector, reconciliacion, backtester ni ejecutor.

## Metricas de aceptacion

Una estrategia se considera apta para produccion cuando:

- muestra retorno consistente en training y validation
- mantiene drawdown controlado
- no depende de un unico parametro extremo
- tiene cantidad razonable de operaciones
- soporta costos operativos reales
- conserva trazabilidad y reproducibilidad total

## Roadmap natural de madurez

- `Fase 1`: data collection e integridad historica
- `Fase 2`: senales y alertas
- `Fase 3`: backtesting y simulacion robusta
- `Fase 4`: optimizacion y validacion estadistica
- `Fase 5`: paper trading
- `Fase 6`: live trading con controles de riesgo
