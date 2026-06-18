# Terminologia cuantitativa y operativa

Este documento define los terminos mas importantes del sistema, con foco en como se interpretan dentro de `TradingBot`.

## Indicadores y variables de estrategia

### `EMA200`

Media movil exponencial de `200` periodos.

En este sistema:

- se calcula sobre serie diaria derivada de velas `1h`
- se usa como filtro de tendencia
- si el precio esta por encima de `EMA200`, la estrategia habilita busqueda de compras

Interpretacion:

- precio por encima de `EMA200`: sesgo alcista
- precio por debajo de `EMA200`: sesgo debil o bajista

### `RSI`

`Relative Strength Index`. Indicador de momentum que compara magnitud de cierres alcistas y bajistas en una ventana fija.

En este sistema:

- se usa `RSI 14`
- valores bajos indican sobreventa relativa
- la estrategia exige que el `RSI` este por debajo de un umbral configurable

Interpretacion:

- `RSI < 35`: agotamiento bajista o debilidad de corto plazo
- `RSI` por si solo no dispara entrada; se combina con tendencia, caida y volumen

### `dropPercent`

Porcentaje de caida del precio actual contra el maximo reciente observado.

Formula conceptual:

```text
((maximo_reciente - precio_actual) / maximo_reciente) * 100
```

En este sistema:

- es un parametro de entrada configurable
- representa la profundidad minima de correccion que debe existir antes de evaluar compra

Interpretacion:

- valor alto: estrategia mas exigente, menos señales
- valor bajo: estrategia mas activa, mas señales

### `recentHighLookbackCandles`

Cantidad de velas hacia atras usadas para buscar el maximo reciente.

En este sistema:

- define la ventana desde donde se calcula `dropPercent`
- afecta mucho la sensibilidad de la correccion detectada

### `volumeMultiplier`

Relacion minima entre volumen actual y volumen promedio historico.

Formula conceptual:

```text
volumen_actual / volumen_promedio
```

En este sistema:

- si el ratio supera el umbral, hay confirmacion por volumen
- permite evitar entradas en correcciones sin participacion relevante

### `volumeLookbackCandles`

Cantidad de velas usadas para calcular el volumen promedio historico de comparacion.

### `takeProfitPercent`

Porcentaje objetivo de salida con ganancia.

En este sistema:

- se usa en backtesting, paper trading y futura ejecucion live
- define el nivel de toma de ganancias desde el precio de entrada

### `stopLossPercent`

Porcentaje maximo de perdida tolerada por operacion.

En este sistema:

- define el corte defensivo de la posicion
- se evalua de forma conservadora en backtest

### `maxHoldingCandles`

Cantidad maxima de velas que un trade puede permanecer abierto si no toca `take profit` ni `stop loss`.

Interpretacion:

- limita permanencia excesiva
- fuerza salida temporal si el trade no resuelve rapido

## Conceptos de backtesting

### `initialCapital`

Capital inicial de la simulacion.

En este sistema:

- es la base para calcular evolucion de equity
- no representa apalancamiento salvo que se modele explicitamente en otra version

### `positionSizePercent`

Porcentaje del capital disponible que se asigna a cada trade.

En este sistema:

- define exposicion por operacion
- impacta retorno, drawdown y frecuencia de crecimiento o deterioro del capital

### `commissionPercent`

Costo porcentual por ejecucion.

En este sistema:

- se descuenta tanto en entrada como en salida
- evita sobreestimar rentabilidad

### `slippagePercent`

Desviacion simulada entre el precio teorico y el precio de ejecucion.

En este sistema:

- empeora artificialmente la entrada o la salida para modelar friccion real

### `minTradeNotional`

Monto minimo monetario requerido para que una orden sea valida.

En este sistema:

- evita simular trades imposibles por tamano insuficiente

### `quantityStep`

Incremento minimo permitido en cantidad operada.

En este sistema:

- la cantidad se redondea hacia abajo al step permitido
- evita cantidades irreales para exchange

### `equityCurve`

Serie temporal del capital acumulado del backtest.

En este sistema:

- contiene puntos realizados y flotantes
- sirve para medir drawdown, comportamiento y estabilidad del sistema

### `REALIZED`

Punto de equity ya consolidado por cierre de trade.

### `FLOATING`

Punto de equity mark-to-market usando el cierre de la vela observada durante un trade abierto.

### `FLOATING_WORST`

Punto de equity conservador usando el peor precio intravela observado mientras el trade estuvo abierto.

En este sistema:

- se usa para no subestimar drawdown intratrade

### `MFE`

`Maximum Favorable Excursion`.

Mide el mejor movimiento porcentual a favor del trade antes del cierre.

En este sistema:

- ayuda a ver si el trade dejo ganancia sobre la mesa
- sirve para evaluar si el `take profit` es demasiado corto

### `MAE`

`Maximum Adverse Excursion`.

Mide el peor movimiento porcentual en contra del trade antes del cierre.

En este sistema:

- ayuda a entender dolor real del trade
- sirve para revisar si el `stop loss` es demasiado ajustado o demasiado amplio

## Metricas de resultado

### `returnPercent`

Retorno porcentual total del backtest respecto del capital inicial.

### `winRate`

Porcentaje de operaciones ganadoras sobre el total.

Interpretacion:

- por si solo no alcanza
- debe leerse junto con payoff, drawdown y expectancy

### `profitFactor`

Relacion entre ganancias brutas y perdidas brutas.

Formula conceptual:

```text
ganancias_brutas / perdidas_brutas
```

Interpretacion:

- `> 1`: sistema rentable en agregado
- `= 1`: equilibrio
- `< 1`: sistema perdedor

### `averageWin`

Ganancia promedio de los trades positivos.

### `averageLoss`

Perdida promedio de los trades negativos.

### `expectancy`

Resultado neto esperado por trade.

En este sistema:

- se calcula como `netProfit / totalTrades`
- cuanto mayor sea y mas estable resulte fuera de muestra, mejor

### `maxDrawdown`

Mayor caida porcentual del equity desde un pico previo hasta un minimo posterior.

Interpretacion:

- mide severidad del riesgo historico
- es una de las metricas mas importantes para validar robustez

### `exposureTimePercent`

Porcentaje del tiempo total del backtest durante el cual la estrategia estuvo con posicion abierta.

### `averageHoldingHours`

Duracion promedio de las operaciones en horas.

### `maxConsecutiveWins`

Mayor racha de trades ganadores consecutivos.

### `maxConsecutiveLosses`

Mayor racha de trades perdedores consecutivos.

## Validacion cuantitativa

### `training`

Subconjunto historico usado para optimizar parametros.

Regla clave:

- no debe contener informacion futura del tramo de validacion

### `validation`

Subconjunto historico fuera de muestra usado para probar si la configuracion optimizada conserva su comportamiento.

### `splitRatio`

Proporcion del dataset destinada a `training` dentro de un split simple.

Ejemplo:

- `0.7` implica `70% training` y `30% validation`

### `returnDegradationPercent`

Mide cuanto empeora el retorno entre training y validation.

Interpretacion:

- cuanto menor, mejor
- valores altos sugieren fragilidad o sobreajuste

### `drawdownDeltaPercent`

Diferencia de drawdown entre validation y training.

Interpretacion:

- si validation sufre drawdown claramente mayor, la configuracion puede no ser estable

### `tradeCountDeltaPercent`

Cambio relativo en cantidad de trades entre training y validation.

Interpretacion:

- ayuda a detectar estrategias que dejan de operar fuera de muestra

### `profitFactorDeltaPercent`

Degradacion relativa del `profitFactor` entre training y validation.

### `expectancyDeltaPercent`

Degradacion relativa de `expectancy` entre training y validation.

### `trainingReturnOverDrawdown`

Relacion entre retorno y drawdown durante training.

### `validationReturnOverDrawdown`

Relacion entre retorno y drawdown durante validation.

Interpretacion:

- permite comparar calidad del retorno ajustado por riesgo

### `consistencyScore`

Score agregado de consistencia entre training y validation.

En este sistema:

- penaliza degradacion de retorno
- penaliza expansion de drawdown
- penaliza caida de profit factor y expectancy
- penaliza brecha entre retorno ajustado por drawdown
- penaliza señales de fragilidad detectadas por flags

Interpretacion:

- valor alto: comportamiento mas estable
- valor bajo: configuracion fragil o inconsistente

### `robustnessScore`

Score compuesto usado para rankear configuraciones del optimizador.

En este sistema:

- prioriza validation sobre training
- incluye consistencia, riesgo y degradacion
- no busca solo la mayor ganancia historica

### `parameterStabilityScore`

Score que estima si una configuracion sigue siendo razonable cuando se comparan combinaciones vecinas del grid.

Interpretacion:

- alto: la zona del grid parece robusta
- bajo: el resultado depende demasiado de un punto exacto

### `robustnessFlags`

Lista de alertas cualitativas detectadas durante la validacion.

Ejemplos:

- `NEGATIVE_VALIDATION_RETURN`
- `LOW_VALIDATION_TRADES`
- `RETURN_DEGRADATION_TOO_HIGH`
- `DRAWDOWN_EXPANSION`
- `VALIDATION_PROFIT_FACTOR_BELOW_1`
- `EXPECTANCY_DEGRADATION`
- `OVERFITTING_DETECTED`

Interpretacion:

- cuantos mas flags aparezcan, menor confianza merece la configuracion

### `overfitting`

Fenomeno donde la estrategia parece muy buena sobre el dataset usado para ajuste, pero falla al cambiar de muestra.

En este sistema:

- se intenta detectar comparando training vs validation
- se penaliza dentro del score de robustez

### `isRobust`

Bandera final que resume si una configuracion supera criterios minimos de consistencia y calidad fuera de muestra.

## Walk-forward

### `walk-forward`

Metodo de validacion en el que se ejecutan multiples ciclos secuenciales de:

1. optimizacion sobre una ventana training
2. prueba sobre la ventana validation siguiente

Objetivo:

- comprobar si la estrategia mantiene calidad en distintos periodos de mercado

### `trainDays`

Cantidad de dias usados en cada ventana de entrenamiento.

### `validationDays`

Cantidad de dias usados en cada ventana de validacion.

### `stepDays`

Cantidad de dias que se avanza para construir la siguiente ventana.

### `robustWindowRatePercent`

Porcentaje de ventanas walk-forward cuya mejor configuracion fue clasificada como robusta.

### `parameterConsistency`

Resumen de dispersion de parametros ganadores entre ventanas.

Interpretacion:

- si los parametros ganadores cambian demasiado, puede haber poca estabilidad estructural

### `overallAssessment`

Clasificacion global del walk-forward.

Valores:

- `ROBUST`
- `MIXED`
- `WEAK`

Interpretacion:

- `ROBUST`: la estrategia conserva calidad en la mayor parte de las ventanas
- `MIXED`: hay evidencia parcial de estabilidad, pero no suficiente para alta confianza
- `WEAK`: la estrategia no mantiene consistencia entre ventanas
