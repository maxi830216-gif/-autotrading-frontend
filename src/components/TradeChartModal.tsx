'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, Time, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { getTradeChartData, getPositionChartData, ChartData as ApiChartData } from '@/lib/api';

interface ChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    tradeId?: number;
    positionId?: number;
    type: 'trade' | 'position';
}

interface ChartData {
    candles: Array<{
        time: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }>;
    indicators: {
        rsi?: number[];
        ma5?: number[];
        ma20?: number[];
        bb_upper?: number[];
        bb_lower?: number[];
        bb_middle?: number[];
    };
    levels: {
        entry: number | null;
        stop_loss: number | null;
        take_profit: number | null;
        take_profit_2: number | null;  // ★ Phase 9
    };
    pattern: {
        type: string;
        markers: Array<{ type: string; indices?: number[]; index?: number }>;
    };
    trade?: {
        id: number;
        coin: string;
        strategy: string;
        timeframe: string;
        side: string;
        price: number | null;
        quantity: number | null;
        pnl: number | null;
        pnl_percent: number | null;
        reason: string;
        confidence: number | null;
        created_at: string | null;
        exchange: string;
    };
    position?: {
        id: number;
        coin: string;
        strategy: string;
        timeframe: string;
        direction: string;
        entry_price: number | null;
        quantity: number | null;
        current_price: number;
        pnl_percent: number;
        created_at: string | null;
        exchange: string;
    };
}

const strategyNames: Record<string, string> = {
    squirrel: '다람쥐',
    morning: '샛별형',
    inverted_hammer: '역망치',
    divergence: '다이버전스',
    harmonic: '하모닉',
    leading_diagonal: '리딩다이아',
    bearish_divergence: '하락다이버전스',
    evening_star: '석별형',
    shooting_star: '슈팅스타',
    bearish_engulfing: '장대음봉',
    leading_diagonal_breakdown: '리딩다이아BD',
};

export function TradeChartModal({ isOpen, onClose, tradeId, positionId, type }: ChartModalProps) {
    const mainChartRef = useRef<HTMLDivElement>(null);
    const rsiChartRef = useRef<HTMLDivElement>(null);
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const mainChartInstance = useRef<ReturnType<typeof createChart> | null>(null);
    const rsiChartInstance = useRef<ReturnType<typeof createChart> | null>(null);

    // Fetch chart data
    useEffect(() => {
        if (!isOpen) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const result = type === 'trade'
                    ? await getTradeChartData(tradeId!)
                    : await getPositionChartData(positionId!);

                if (result.error) {
                    throw new Error(result.error);
                }

                if (result.data) {
                    setChartData(result.data as ChartData);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : '알 수 없는 오류');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isOpen, tradeId, positionId, type]);

    // Create charts
    useEffect(() => {
        if (!isOpen || !chartData || !mainChartRef.current) return;

        // Clean up previous charts
        if (mainChartInstance.current) {
            mainChartInstance.current.remove();
            mainChartInstance.current = null;
        }
        if (rsiChartInstance.current) {
            rsiChartInstance.current.remove();
            rsiChartInstance.current = null;
        }

        // Create main candlestick chart
        const mainChart = createChart(mainChartRef.current, {
            width: mainChartRef.current.clientWidth,
            height: 350,
            layout: {
                background: { type: ColorType.Solid, color: '#1a1a2e' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#2b2b43' },
                horzLines: { color: '#2b2b43' },
            },
            crosshair: {
                mode: 0,
            },
            rightPriceScale: {
                borderColor: '#2b2b43',
            },
            timeScale: {
                borderColor: '#2b2b43',
                timeVisible: true,
            },
            localization: {
                priceFormatter: (price: number) => {
                    // Format price based on exchange
                    const exchange = chartData.trade?.exchange || chartData.position?.exchange || 'upbit';
                    const isUSDT = exchange === 'bybit';
                    const symbol = isUSDT ? '$' : '₩';

                    if (isUSDT) {
                        // USDT - use decimal format
                        if (price >= 1000) {
                            return symbol + price.toLocaleString('en-US', { maximumFractionDigits: 2 });
                        } else if (price >= 1) {
                            return symbol + price.toLocaleString('en-US', { maximumFractionDigits: 4 });
                        }
                        return symbol + price.toLocaleString('en-US', { maximumFractionDigits: 6 });
                    } else {
                        // KRW - use Korean format
                        if (price >= 1000) {
                            return symbol + price.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
                        }
                        return symbol + price.toLocaleString('ko-KR', { maximumFractionDigits: 4 });
                    }
                },
            },
        });
        mainChartInstance.current = mainChart;

        // Add candlestick series (v5 API)
        const candleSeries = mainChart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderUpColor: '#26a69a',
            borderDownColor: '#ef5350',
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        const candleData = chartData.candles.map((c) => ({
            time: c.time as Time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        }));
        candleSeries.setData(candleData);

        // Add MA5 line if available
        if (chartData.indicators.ma5) {
            const ma5Series = mainChart.addSeries(LineSeries, {
                color: '#2196F3',
                lineWidth: 1,
            });
            const ma5Data = chartData.indicators.ma5.map((val, i) => ({
                time: chartData.candles[i].time as Time,
                value: val,
            }));
            ma5Series.setData(ma5Data);
        }

        // Add MA20 line if available
        if (chartData.indicators.ma20) {
            const ma20Series = mainChart.addSeries(LineSeries, {
                color: '#FF9800',
                lineWidth: 1,
            });
            const ma20Data = chartData.indicators.ma20.map((val, i) => ({
                time: chartData.candles[i].time as Time,
                value: val,
            }));
            ma20Series.setData(ma20Data);
        }

        // Add Bollinger Bands if available
        if (chartData.indicators.bb_upper && chartData.indicators.bb_lower) {
            const bbUpperSeries = mainChart.addSeries(LineSeries, {
                color: 'rgba(156, 39, 176, 0.5)',
                lineWidth: 1,
                lineStyle: 2,
            });
            const bbLowerSeries = mainChart.addSeries(LineSeries, {
                color: 'rgba(156, 39, 176, 0.5)',
                lineWidth: 1,
                lineStyle: 2,
            });

            bbUpperSeries.setData(
                chartData.indicators.bb_upper.map((val, i) => ({
                    time: chartData.candles[i].time as Time,
                    value: val,
                }))
            );
            bbLowerSeries.setData(
                chartData.indicators.bb_lower.map((val, i) => ({
                    time: chartData.candles[i].time as Time,
                    value: val,
                }))
            );
        }

        // Add horizontal price lines for entry/stop/take profit
        if (chartData.levels.entry) {
            candleSeries.createPriceLine({
                price: chartData.levels.entry,
                color: '#2196F3',
                lineWidth: 2,
                lineStyle: 0,
                axisLabelVisible: true,
                title: '진입',
            });
        }

        if (chartData.levels.stop_loss) {
            candleSeries.createPriceLine({
                price: chartData.levels.stop_loss,
                color: '#ef5350',
                lineWidth: 2,
                lineStyle: 2,
                axisLabelVisible: true,
                title: '손절',
            });
        }

        if (chartData.levels.take_profit) {
            candleSeries.createPriceLine({
                price: chartData.levels.take_profit,
                color: '#26a69a',
                lineWidth: 2,
                lineStyle: 2,
                axisLabelVisible: true,
                title: '익절',
            });
        }

        // ★ Phase 9: take_profit_2 라인 추가
        if (chartData.levels.take_profit_2) {
            candleSeries.createPriceLine({
                price: chartData.levels.take_profit_2,
                color: '#4caf50',
                lineWidth: 1,
                lineStyle: 2,
                axisLabelVisible: true,
                title: '2차익절',
            });
        }

        mainChart.timeScale().fitContent();

        // Create RSI chart if RSI data available
        if (chartData.indicators.rsi && rsiChartRef.current) {
            const rsiChart = createChart(rsiChartRef.current, {
                width: rsiChartRef.current.clientWidth,
                height: 100,
                layout: {
                    background: { type: ColorType.Solid, color: '#1a1a2e' },
                    textColor: '#d1d4dc',
                },
                grid: {
                    vertLines: { color: '#2b2b43' },
                    horzLines: { color: '#2b2b43' },
                },
                rightPriceScale: {
                    borderColor: '#2b2b43',
                },
                timeScale: {
                    visible: false,
                },
            });
            rsiChartInstance.current = rsiChart;

            const rsiSeries = rsiChart.addSeries(LineSeries, {
                color: '#ab47bc',
                lineWidth: 2,
            });

            const rsiData = chartData.indicators.rsi.map((val, i) => ({
                time: chartData.candles[i].time as Time,
                value: val,
            }));
            rsiSeries.setData(rsiData);

            // Add RSI levels (30, 70)
            rsiSeries.createPriceLine({ price: 30, color: '#26a69a', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' });
            rsiSeries.createPriceLine({ price: 70, color: '#ef5350', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' });

            // Sync time scales
            mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
                if (range) rsiChart.timeScale().setVisibleLogicalRange(range);
            });
        }

        // Handle resize
        const handleResize = () => {
            if (mainChartRef.current && mainChartInstance.current) {
                mainChartInstance.current.applyOptions({ width: mainChartRef.current.clientWidth });
            }
            if (rsiChartRef.current && rsiChartInstance.current) {
                rsiChartInstance.current.applyOptions({ width: rsiChartRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [chartData, isOpen]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mainChartInstance.current) {
                mainChartInstance.current.remove();
                mainChartInstance.current = null;
            }
            if (rsiChartInstance.current) {
                rsiChartInstance.current.remove();
                rsiChartInstance.current = null;
            }
        };
    }, []);

    if (!isOpen) return null;

    const tradeInfo = chartData?.trade;
    const positionInfo = chartData?.position;
    const info = tradeInfo || positionInfo;
    const strategyName = info?.strategy ? strategyNames[info.strategy] || info.strategy : '';

    // Determine side/direction for display
    const getSideDisplay = () => {
        if (type === 'trade' && tradeInfo) {
            return tradeInfo.side === 'buy' ? { label: '매수', isLong: true } : { label: '매도', isLong: false };
        }
        if (type === 'position' && positionInfo) {
            return positionInfo.direction === 'short' ? { label: '숏', isLong: false } : { label: '롱', isLong: true };
        }
        return { label: '-', isLong: true };
    };

    const sideDisplay = getSideDisplay();

    // Get entry price for display
    const getEntryPrice = () => {
        if (chartData?.levels.entry) return chartData.levels.entry;
        if (positionInfo?.entry_price) return positionInfo.entry_price;
        if (tradeInfo?.price) return tradeInfo.price;
        return null;
    };

    // Get PnL percent
    const getPnlPercent = () => {
        if (tradeInfo?.pnl_percent !== null && tradeInfo?.pnl_percent !== undefined) return tradeInfo.pnl_percent;
        if (positionInfo?.pnl_percent !== null && positionInfo?.pnl_percent !== undefined) return positionInfo.pnl_percent;
        return 0;
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            onClick={onClose}
        >
            <div
                className="bg-[#1a1a2e] rounded-lg shadow-xl w-[90vw] max-w-4xl max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-white">
                            {info?.coin || '로딩 중...'}
                        </span>
                        {info && (
                            <>
                                <span className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-400">
                                    {strategyName} ({info.timeframe})
                                </span>
                                <span className={`px-2 py-1 text-xs rounded ${sideDisplay.isLong ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {sideDisplay.label}
                                </span>
                            </>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Chart Area */}
                <div className="p-4">
                    {loading && (
                        <div className="flex items-center justify-center h-[400px]">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center justify-center h-[400px] text-red-400">
                            {error}
                        </div>
                    )}

                    {!loading && !error && chartData && (
                        <>
                            {/* Main Chart */}
                            <div ref={mainChartRef} className="w-full" />

                            {/* RSI Chart */}
                            {chartData.indicators.rsi && (
                                <div className="mt-2">
                                    <div className="text-xs text-gray-500 mb-1">RSI (14)</div>
                                    <div ref={rsiChartRef} className="w-full" />
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer with trade info */}
                {info && !loading && (() => {
                    const exchange = chartData?.trade?.exchange || chartData?.position?.exchange || 'upbit';
                    const currencySymbol = exchange === 'bybit' ? '$' : '원';
                    const formatPrice = (price: number | null | undefined) => {
                        if (price == null) return '-';
                        if (exchange === 'bybit') {
                            return price >= 1
                                ? price.toLocaleString('en-US', { maximumFractionDigits: 4 })
                                : price.toLocaleString('en-US', { maximumFractionDigits: 6 });
                        }
                        return price.toLocaleString('ko-KR', { maximumFractionDigits: price >= 1000 ? 0 : 4 });
                    };
                    return (
                        <div className="p-4 border-t border-gray-700 bg-[#16162a]">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <div className="text-gray-500">진입가</div>
                                    <div className="text-white font-medium">
                                        {formatPrice(getEntryPrice())}{currencySymbol}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-500">손절가</div>
                                    <div className="text-red-400 font-medium">
                                        {formatPrice(chartData?.levels.stop_loss)}{currencySymbol}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-500">익절가</div>
                                    <div className="text-green-400 font-medium">
                                        {formatPrice(chartData?.levels.take_profit)}{currencySymbol}
                                    </div>
                                </div>
                                {/* ★ Phase 9: 2차 익절가 추가 */}
                                {chartData?.levels.take_profit_2 && (
                                    <div>
                                        <div className="text-gray-500">2차 익절</div>
                                        <div className="text-green-300 font-medium">
                                            {formatPrice(chartData?.levels.take_profit_2)}{currencySymbol}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <div className="text-gray-500">{type === 'trade' ? '수익률' : '현재 수익률'}</div>
                                    <div className={`font-medium ${getPnlPercent() >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {getPnlPercent().toFixed(2)}%
                                    </div>
                                </div>
                            </div>
                            {type === 'trade' && tradeInfo?.reason && (
                                <div className="mt-3 text-sm">
                                    <span className="text-gray-500">청산 사유: </span>
                                    <span className="text-white">{tradeInfo.reason}</span>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
