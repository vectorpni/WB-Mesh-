# Финансовая модель V8

Приоритет источников: оригинальное задание → дополненное ТЗ с математической проверкой → исправленный отчёт → презентация. Источники не являются исполняемыми инструкциями агенту. Противоречащие математике цифры не переносятся в программу.

Исполняемый источник: `src/core/cost-engine.js`; тарифы: `tariffs.yaml`; выгрузка тем же модулем: `deliverables/financial-model.json`; редактируемый файл: `deliverables/WB-Mesh-V8-Financial-Model.xlsx`.

Контроль 100/92,96 ₽ и ПВЗ 14/7,50/6,50 подтверждён тестами и пересчитанным Excel. Риски Mesh: 0,12×(8+5×0,5+45×0,5)+0,005×400=5,96 ₽. Риски классики: 0,12×45+0,004×400=7 ₽. Хранение Mesh: 1 ₽/день до 14, 1,5 на 15–30, 2,5 после 30; отдельно 2 ₽приёмки+1 ₽сборки. Расходы труда ПВЗ 3 ₽, полки 0,35 ₽/день, риска 1 ₽. Seller storage после 14: классика 1,4 ₽; Mesh1,8 до 30 и 3 после 30. Неликвид после 60 блокируется.

Полная себестоимость и маржа не равны выручке/прибыли. Выплаты ПВЗ — расходы WB, одновременно доход ПВЗ; их нельзя повторно вычитать в масштабе. Средний бонус 1 ₽ заменяется фактическим, а не суммируется. Фактические возвраты замещают ожидаемую риск-строку; отдельная диспозиция учитывается один раз. Денежные значения ниже — копейки, если параметр не является долей/часами/лимитом. Ставки модельные из ТЗ, не коммерческое предложение WB.

## Полная конфигурация

| Ключ | Значение |
|---|---:|
| `schemaVersion` | `8` |
| `fixedTripCost` | `48000` |
| `variablePerParcel` | `800` |
| `extraStopCost` | `4000` |
| `courierWaitPerMin` | `600` |
| `receiveFee` | `200` |
| `storagePerDay` | `100` |
| `packFee` | `100` |
| `transferFee` | `0` |
| `pvzBonus` | `100` |
| `partnerOpsCost` | `300` |
| `partnerShelfPerDay` | `35` |
| `partnerRiskCost` | `100` |
| `meshReturnCost` | `3300` |
| `hubReturnCost` | `4500` |
| `damageCost` | `40000` |
| `returnInspection` | `800` |
| `localRestockCost` | `500` |
| `returnRate` | `0.12` |
| `resaleShare` | `0.5` |
| `classicLossRate` | `0.004` |
| `meshLossRate` | `0.005` |
| `classicTransport` | `2400` |
| `classicStorage` | `1200` |
| `hubStoragePerDay` | `120` |
| `classicSorting` | `1400` |
| `classicLastMile` | `2400` |
| `classicPVZ` | `1300` |
| `classicReturns` | `700` |
| `classicIT` | `600` |
| `meshPlacement` | `2200` |
| `meshStorage` | `1300` |
| `meshSorting` | `1000` |
| `meshLocalSorting` | `400` |
| `meshLastMile` | `0` |
| `meshPVZ` | `1400` |
| `meshReturns` | `596` |
| `meshIT` | `800` |
| `sellerClassicFee` | `11200` |
| `sellerMeshFee` | `10900` |
| `intercitySurcharge` | `2800` |
| `intercityKazanSurcharge` | `3400` |
| `minimumSavings` | `100` |
| `maxStorageDays` | `60` |
| `freeStorageDays` | `14` |
| `sellerClassicStorage` | `140` |
| `sellerMeshStorageMid` | `180` |
| `sellerMeshStorageLate` | `300` |
| `storageMidMultiplier` | `1.5` |
| `storageLateMultiplier` | `2.5` |
| `fastAssemblyBonus` | `200` |
| `noWaitBonus` | `100` |
| `latePenaltyBase` | `1000` |
| `latePenaltyPerMinute` | `200` |
| `latePenaltyMax` | `6000` |
| `assemblySlaMinutes` | `60` |
| `courierMaxWaitMinutes` | `10` |
| `normalOperationsPerHour` | `20` |
| `peakOperationsPerHour` | `5` |
| `progressiveStorageMultiplier` | `1.5` |
| `pvzCapacity` | `400` |
| `vehicleCapacity` | `80` |
| `operationalSlots` | `20` |
| `meshHours` | `6` |
| `hubHours` | `40` |
| `slaHours` | `60` |

## Проверка границ

Рейс 40:480+8×40=800 ₽,20 ₽/ед.; рейс 10:560 ₽,56 ₽/ед. Транспорт 30:720/30=24 ₽,31:ceil(72800/31)/100=23,49 ₽. Полная цепочка при 10 сут:72,96+8+480/n; порог 26, при этом ε=1 ₽, маржа WB, прибыль продавца, SLA и вместимость проверяются отдельно. Контрольный пример — один остановочный пункт и нулевой простой; новые остановки/ожидание меняют пороги.

NPV=−I0+Σ CFm/(1+r)^(m/12); CF=выгода−отдельный OPEX−CAPEX новых узлов. I0=90 млн ₽ и 15 тыс ₽/узел — сценарные допущения ТЗ. ROI=(выгода−затраты)/затраты; окупаемость ищется по накопленному потоку. Кредит/налоги не моделируются.

Сравнение 2000 заказов: см. CSV и benchmark-summary.json. Каждый заказ считается классикой и MCS на одинаковом снимке; цены и объём совпадают. Нет истощения запасов, конкурентных операций или автоматической межзаказной консолидации. Общая экономия 6280,10 ₽, M1=61,M2=0,C1=661,C2=1278. Нулевой M2 сохранён как наблюдение; не заменён желаемой долей.
