'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    getBybitWhitelist,
    getBybitPortfolio,
    getBybitLogs,
    closeBybitPosition,
    getBybitBotStatus,
    startBybitBot,
    stopBybitBot,
    getBybitPeriodReturns,
    BybitWhitelistItem,
    BybitPortfolioResponse,
    SystemLogEntry,
    BybitBotStatus,
    BybitPeriodReturns,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Settings, TrendingUp, TrendingDown, Activity, Eye, Wallet, LogOut, User, ChevronDown, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function formatUSDT(value: number): string {
    if (value < 1) {
        return value.toFixed(4);
    }
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 가격 표시용 (소수점 4자리)
function formatPrice(value: number): string {
    if (value >= 100) {
        return value.toFixed(2);
    }
    return value.toFixed(4);
}

function formatPercent(value: number | null): string {
    if (value === null) return '-';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

type TradingMode = 'simulation' | 'real';

export default function BybitDashboard() {
    const { user, logout, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<TradingMode>('simulation');
    const [whitelist, setWhitelist] = useState<BybitWhitelistItem[]>([]);
    const [whitelistUpdatedAt, setWhitelistUpdatedAt] = useState<string | null>(null);
    const [portfolio, setPortfolio] = useState<BybitPortfolioResponse | null>(null);
    const [logs, setLogs] = useState<SystemLogEntry[]>([]);
    const [botStatus, setBotStatus] = useState<BybitBotStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [closingPosition, setClosingPosition] = useState<number | null>(null);

    // Period returns
    const [periodDays, setPeriodDays] = useState<number>(1);
    const [periodReturns, setPeriodReturns] = useState<BybitPeriodReturns | null>(null);

    const logContainerRef = useRef<HTMLDivElement>(null);

    const fetchData = useCallback(async () => {
        try {
            const [whitelistRes, portfolioRes, logsRes, botStatusRes, returnsRes] = await Promise.all([
                getBybitWhitelist(activeTab),
                getBybitPortfolio(activeTab),
                getBybitLogs(50, activeTab),
                getBybitBotStatus(),
                getBybitPeriodReturns(activeTab, periodDays),
            ]);

            if (whitelistRes.data) {
                setWhitelist(whitelistRes.data.coins);
                setWhitelistUpdatedAt(whitelistRes.data.updated_at);
            }
            if (portfolioRes.data) setPortfolio(portfolioRes.data);
            if (logsRes.data) setLogs(logsRes.data.logs);
            if (botStatusRes.data) setBotStatus(botStatusRes.data);
            if (returnsRes.data) setPeriodReturns(returnsRes.data);
        } catch (error) {
            console.error('Failed to fetch Bybit data:', error);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleClosePosition = async (positionId: number) => {
        setClosingPosition(positionId);
        try {
            const result = await closeBybitPosition(positionId);
            if (result.data?.success) {
                fetchData();
            } else if (result.error) {
                alert(`청산 실패: ${result.error}`);
            }
        } catch (error) {
            console.error('Error closing position:', error);
            alert('청산 중 오류가 발생했습니다');
        } finally {
            setClosingPosition(null);
        }
    };

    const getLogMessageStyle = (message: string) => {
        if (message.includes('롱 진입')) {
            return { className: 'text-green-400', isBold: true };
        }
        if (message.includes('롱 청산') || message.includes('손절')) {
            return { className: 'text-red-400', isBold: true };
        }
        if (message.includes('펀딩비')) {
            return { className: 'text-yellow-400', isBold: false };
        }
        return { className: 'text-gray-300', isBold: false };
    };

    const handleBotToggle = async (checked: boolean) => {
        try {
            let result;
            if (checked) {
                result = await startBybitBot(activeTab);
            } else {
                result = await stopBybitBot(activeTab);
            }

            if (result.error) {
                alert(`봇 제어 실패: ${result.error}`);
                // Revert switch state logic if needed, but fetching data should handle it
            } else {
                // Success - wait a bit for backend to process
                setTimeout(fetchData, 500);
            }
        } catch (error) {
            console.error('Bot toggle error:', error);
            alert('봇 제어 중 오류가 발생했습니다.');
        }
        fetchData();
    };

    const isCurrentBotRunning = activeTab === 'simulation'
        ? botStatus?.simulation_running
        : botStatus?.real_running;

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-gray-400 animate-pulse">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
                            <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <h1 className="font-bold text-base sm:text-lg">MAXI AI Trading</h1>
                            <p className="text-[10px] sm:text-xs text-yellow-400">Bybit 선물</p>
                        </div>

                        {/* Exchange Switcher - Buttons */}
                        <div className="ml-2 sm:ml-4 flex gap-1">
                            <Link href="/">
                                <div className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs sm:text-sm text-gray-300 transition-colors">
                                    Upbit
                                </div>
                            </Link>
                            <div className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 bg-yellow-600 rounded-lg text-xs sm:text-sm font-medium">
                                Bybit
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        {user && (
                            <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
                                <User className="w-4 h-4" />
                                <span>{user.email}</span>
                            </div>
                        )}
                        <Link href="/settings" onClick={() => localStorage.setItem('selectedExchange', 'bybit')}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                            </Button>
                        </Link>

                        {/* Strategy Guide */}
                        <Link href="/guide">
                            <Button variant="outline" size="sm" className="h-8 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm border-gray-700 text-gray-300 hover:bg-gray-800">
                                <span className="hidden sm:inline">📚 가이드</span>
                                <span className="sm:hidden">📚</span>
                            </Button>
                        </Link>

                        {/* Trading History */}
                        <Link href="/history?exchange=bybit">
                            <Button variant="outline" size="sm" className="h-8 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm border-gray-700 text-gray-300 hover:bg-gray-800">
                                <span className="hidden sm:inline">📋 거래내역</span>
                                <span className="sm:hidden">📋</span>
                            </Button>
                        </Link>

                        <Button variant="ghost" size="icon" onClick={logout} title="로그아웃" className="h-8 w-8 sm:h-10 sm:w-10">
                            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
                {/* Tabs */}
                <div className="flex gap-2 mb-4 sm:mb-6">
                    <button
                        onClick={() => setActiveTab('simulation')}
                        className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${activeTab === 'simulation'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        📊 모의투자
                        <Badge className={`ml-1 sm:ml-2 text-xs ${botStatus?.simulation_running ? 'bg-green-600' : 'bg-gray-600'}`}>
                            {botStatus?.simulation_running ? 'ON' : 'OFF'}
                        </Badge>
                    </button>
                    <button
                        onClick={() => setActiveTab('real')}
                        className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${activeTab === 'real'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        💰 실전투자
                        <Badge className={`ml-1 sm:ml-2 text-xs ${botStatus?.real_running ? 'bg-green-600' : 'bg-gray-600'}`}>
                            {botStatus?.real_running ? 'ON' : 'OFF'}
                        </Badge>
                    </button>
                </div>

                {/* Mode Indicator */}
                <div className={`mb-4 p-2 sm:p-3 rounded-lg border ${activeTab === 'simulation'
                    ? 'bg-yellow-900/20 border-yellow-600/50'
                    : 'bg-green-900/20 border-green-600/50'
                    }`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <span className={`text-sm sm:text-lg font-bold ${activeTab === 'simulation' ? 'text-yellow-400' : 'text-green-400'}`}>
                                {activeTab === 'simulation' ? '📊 모의투자 모드' : '💰 실전투자 모드'} 5x 레버리지(격리마진)
                            </span>
                        </div>

                        {/* Bot Toggle */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-xs sm:text-sm text-gray-400">봇</span>
                            <Switch
                                checked={isCurrentBotRunning || false}
                                onCheckedChange={handleBotToggle}
                                className={activeTab === 'simulation'
                                    ? 'data-[state=checked]:bg-yellow-600'
                                    : 'data-[state=checked]:bg-green-600'
                                }
                            />
                            <Badge
                                variant={isCurrentBotRunning ? 'default' : 'secondary'}
                                className={isCurrentBotRunning
                                    ? (activeTab === 'simulation' ? 'bg-yellow-600' : 'bg-green-600')
                                    : ''
                                }
                            >
                                {isCurrentBotRunning ? 'ON' : 'OFF'}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-8 space-y-4 sm:space-y-6">
                        {/* Portfolio Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <Card className="bg-gray-900 border-gray-800">
                                <CardHeader className="pb-1 p-2 sm:p-3 sm:pb-1">
                                    <CardTitle className="text-[10px] sm:text-xs font-medium text-gray-400 flex items-center gap-1">
                                        <Wallet className="w-3 h-3" />
                                        전체 자산
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-2 sm:p-3 pt-0">
                                    <p className="text-sm sm:text-lg font-bold">${formatUSDT(portfolio?.total_asset_value || 0)}</p>
                                    {/* 평가금액 = 증거금 + 손익 */}
                                    {(() => {
                                        const usdt = portfolio?.usdt_balance || 0;
                                        const margin = portfolio?.total_position_value || 0;
                                        const pnl = portfolio?.total_unrealized_pnl || 0;
                                        const positionValue = margin + pnl; // 평가금액 = 증거금 + 손익
                                        const total = usdt + positionValue;
                                        const usdtPercent = total > 0 ? (usdt / total) * 100 : 100;
                                        const positionPercent = total > 0 ? (positionValue / total) * 100 : 0;

                                        return (
                                            <>
                                                {/* 노란색(USDT)이 먼저, 파란색(평가금액)이 나중에 */}
                                                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden flex mt-1.5">
                                                    <div
                                                        className="bg-yellow-500 h-full"
                                                        style={{ width: `${usdtPercent}%` }}
                                                    />
                                                    <div
                                                        className="bg-blue-500 h-full"
                                                        style={{ width: `${positionPercent}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between mt-1 text-[9px] sm:text-[10px]">
                                                    <span className="text-yellow-400">💵 ${formatUSDT(usdt)}</span>
                                                    <span className="text-blue-400">
                                                        🪙 ${formatUSDT(positionValue)}
                                                        <span className={pnl >= 0 ? "text-green-400" : "text-red-400"}>
                                                            ({pnl >= 0 ? '+' : ''}{formatUSDT(pnl)})
                                                        </span>
                                                    </span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </CardContent>
                            </Card>

                            <Card className="bg-gray-900 border-gray-800">
                                <CardHeader className="pb-1 p-2 sm:p-3 sm:pb-1">
                                    <CardTitle className="text-[10px] sm:text-xs font-medium text-gray-400 flex items-center gap-1">
                                        {(portfolio?.total_unrealized_pnl || 0) >= 0 ? (
                                            <TrendingUp className="w-3 h-3 text-green-500" />
                                        ) : (
                                            <TrendingDown className="w-3 h-3 text-red-500" />
                                        )}
                                        미실현 손익
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-2 sm:p-3 pt-0">
                                    <p className={`text-sm sm:text-lg font-bold ${(portfolio?.total_unrealized_pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {(portfolio?.total_unrealized_pnl || 0) >= 0 ? '+' : ''}${formatUSDT(Math.abs(portfolio?.total_unrealized_pnl || 0))}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-gray-900 border-gray-800">
                                <CardHeader className="pb-1 p-2 sm:p-3 sm:pb-1">
                                    <CardTitle className="text-[10px] sm:text-xs font-medium text-gray-400 flex items-center gap-1">
                                        <Activity className="w-3 h-3" />
                                        보유 포지션
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-2 sm:p-3 pt-0">
                                    <p className="text-sm sm:text-lg font-bold">{portfolio?.positions?.length || 0}개</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                        {(() => {
                                            const positions = portfolio?.positions || [];
                                            const longs = positions.filter(p => (p as any).direction !== 'short').length;
                                            const shorts = positions.filter(p => (p as any).direction === 'short').length;
                                            if (shorts === 0) return '롱 포지션';
                                            if (longs === 0) return '숏 포지션';
                                            return `롱 ${longs} / 숏 ${shorts}`;
                                        })()}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Period Returns */}
                            <Card className="bg-gray-900 border-gray-800">
                                <CardHeader className="pb-1 p-2 sm:p-3 sm:pb-1">
                                    <CardTitle className="text-[10px] sm:text-xs font-medium text-gray-400 flex items-center gap-1 justify-between">
                                        <div className="flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" />
                                            <span className="hidden sm:inline">기간 수익률</span>
                                            <span className="sm:hidden">수익률</span>
                                        </div>
                                        <select
                                            value={periodDays}
                                            onChange={(e) => setPeriodDays(Number(e.target.value))}
                                            className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-[10px]"
                                        >
                                            <option value={1}>1일</option>
                                            <option value={7}>7일</option>
                                            <option value={30}>30일</option>
                                        </select>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-2 sm:p-3 pt-0">
                                    {(() => {
                                        const pnl = periodReturns?.total_pnl || 0;
                                        const pnlPercent = periodReturns?.pnl_percent || 0;
                                        return (
                                            <>
                                                <p className={`text-sm sm:text-lg font-bold truncate ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {pnl >= 0 ? '+' : ''}${formatUSDT(Math.abs(pnl))}
                                                </p>
                                                <p className={`text-[10px] mt-0.5 ${pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {formatPercent(pnlPercent)} ({periodReturns?.trade_count || 0}건)
                                                </p>
                                            </>
                                        );
                                    })()}
                                </CardContent>
                            </Card>
                        </div>

                        {/* AI/Manual 분리 표시 */}
                        {portfolio?.positions && portfolio.positions.length > 0 && (() => {
                            // ★ 평가금액(증거금+손익) 기준 내림차순 정렬
                            const getEvaluationValue = (p: typeof portfolio.positions[0]) => {
                                const buyAmount = p.total_buy_amount || p.entry_price * p.quantity;
                                const leverage = p.leverage || 5;
                                const margin = buyAmount / leverage;
                                return margin + p.unrealized_pnl;
                            };

                            const aiPositions = portfolio.positions
                                .filter(p => p.source === 'ai' || p.strategy !== 'manual')
                                .sort((a, b) => getEvaluationValue(b) - getEvaluationValue(a));
                            const manualPositions = portfolio.positions
                                .filter(p => p.source !== 'ai' && p.strategy === 'manual')
                                .sort((a, b) => getEvaluationValue(b) - getEvaluationValue(a));

                            // 증거금 계산 (레버리지 미적용)
                            const aiMargin = aiPositions.reduce((sum, p) => {
                                const buyAmount = p.total_buy_amount || p.entry_price * p.quantity;
                                const leverage = p.leverage || 5;
                                return sum + (buyAmount / leverage);
                            }, 0);
                            const aiPnl = aiPositions.reduce((sum, p) => sum + p.unrealized_pnl, 0);
                            // 평가금액 = 증거금 + 손익
                            const aiValue = aiMargin + aiPnl;
                            const aiPnlPct = aiMargin > 0 ? (aiPnl / aiMargin) * 100 : 0;

                            // 직접 매매도 동일하게 계산
                            const manualMargin = manualPositions.reduce((sum, p) => {
                                const buyAmount = p.total_buy_amount || p.entry_price * p.quantity;
                                const leverage = p.leverage || 5;
                                return sum + (buyAmount / leverage);
                            }, 0);
                            const manualPnl = manualPositions.reduce((sum, p) => sum + p.unrealized_pnl, 0);
                            // 평가금액 = 증거금 + 손익
                            const manualValue = manualMargin + manualPnl;
                            const manualPnlPct = manualMargin > 0 ? (manualPnl / manualMargin) * 100 : 0;

                            const renderPositionRow = (pos: typeof portfolio.positions[0], isAI: boolean) => {
                                const direction = (pos as any).direction || 'long';
                                const isShort = direction === 'short';
                                return (
                                    <tr key={pos.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                        <td className="py-3 px-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isAI ? 'bg-gradient-to-br from-yellow-500 to-orange-600' : 'bg-gradient-to-br from-gray-500 to-gray-600'}`}>
                                                    {pos.symbol.replace('USDT', '').slice(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-medium">{pos.symbol.replace('USDT', '')}</span>
                                                        <span className="text-[10px]">{isAI ? '🤖' : '👤'}</span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-500">{pos.strategy}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-center py-3 px-2">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <Badge className={`text-[10px] px-1.5 ${isShort ? 'bg-red-600/30 text-red-400 border border-red-600' : 'bg-green-600/30 text-green-400 border border-green-600'}`}>
                                                    {isShort ? 'Short' : 'Long'}
                                                </Badge>
                                                <Badge className="bg-yellow-600/30 text-yellow-400 border border-yellow-600">{pos.leverage || 5}x</Badge>
                                            </div>
                                        </td>
                                        <td className={`text-right py-3 px-2 font-medium ${pos.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {pos.unrealized_pnl >= 0 ? '+' : ''}${formatUSDT(Math.abs(pos.unrealized_pnl))}
                                        </td>
                                        <td className={`text-right py-3 px-2 font-bold ${pos.unrealized_pnl_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {formatPercent(pos.unrealized_pnl_percent)}
                                        </td>
                                        <td className="text-right py-3 px-1 text-gray-300">{pos.quantity.toFixed(4)}</td>
                                        <td className="text-right py-3 px-1 text-blue-400">${formatPrice(pos.current_price || pos.entry_price)}</td>
                                        <td className="text-right py-3 px-1 text-gray-300">${formatPrice(pos.entry_price)}</td>
                                        <td className="text-right py-3 px-2 text-gray-300">${formatUSDT(pos.total_buy_amount || pos.entry_price * pos.quantity)}</td>
                                        <td className="text-right py-3 px-2 text-gray-300">${formatUSDT((pos.margin_used || (pos.total_buy_amount || pos.entry_price * pos.quantity) / (pos.leverage || 5)) + pos.unrealized_pnl)}</td>
                                        <td className="text-right py-3 px-2 text-red-400 text-xs">${pos.liquidation_price ? formatUSDT(pos.liquidation_price) : '-'}</td>
                                        <td className="text-center py-3 px-2">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-7 px-3 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10" disabled={closingPosition === pos.id}>
                                                        {closingPosition === pos.id ? '⏳' : '청산'}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-gray-900 border-gray-700">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-red-500">⚠️ 포지션 청산 확인</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-gray-300">
                                                            <strong>{pos.symbol}</strong> <span className={isShort ? 'text-red-400' : 'text-green-400'}>{isShort ? '숏' : '롱'}</span> 포지션을 청산합니다.<br />
                                                            예상 수익: <span className={pos.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                                ${formatUSDT(pos.unrealized_pnl)} ({formatPercent(pos.unrealized_pnl_percent)})
                                                            </span>
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="bg-gray-700 text-white border-gray-600">취소</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleClosePosition(pos.id)} className="bg-red-600 hover:bg-red-700">청산 실행</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </td>
                                    </tr>
                                );
                            };

                            return (
                                <div className="space-y-4">
                                    {/* AI 매매 보유 내역 */}
                                    {aiPositions.length > 0 && (
                                        <Card className="bg-gray-900 border-gray-800 border-l-4 border-l-yellow-500">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="flex items-center gap-2">
                                                    <span className="text-xl">🤖</span>
                                                    <span>AI 매매</span>
                                                    <Badge className="bg-yellow-600 text-xs">{aiPositions.length}개</Badge>
                                                </CardTitle>
                                                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                                                    <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                                                        <div className="text-gray-400 text-xs mb-1">평가금액</div>
                                                        <div className="font-semibold">${formatUSDT(aiValue)}</div>
                                                    </div>
                                                    <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                                                        <div className="text-gray-400 text-xs mb-1">미실현 손익</div>
                                                        <div className={`font-semibold ${aiPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {aiPnl >= 0 ? '+' : ''}${formatUSDT(Math.abs(aiPnl))}
                                                        </div>
                                                    </div>
                                                    <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                                                        <div className="text-gray-400 text-xs mb-1">수익률</div>
                                                        <div className={`font-semibold ${aiPnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {formatPercent(aiPnlPct)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs sm:text-sm">
                                                        <thead>
                                                            <tr className="border-b border-gray-700 text-gray-400 text-[10px]">
                                                                <th className="text-left py-2 px-1">티커</th>
                                                                <th className="text-center py-2 px-1">레버리지</th>
                                                                <th className="text-right py-2 px-1">손익</th>
                                                                <th className="text-right py-2 px-1">수익률</th>
                                                                <th className="text-right py-2 px-1">수량</th>
                                                                <th className="text-right py-2 px-1">현재가</th>
                                                                <th className="text-right py-2 px-1">매수평균가</th>
                                                                <th className="text-right py-2 px-1">매수금액</th>
                                                                <th className="text-right py-2 px-1">평가금액</th>
                                                                <th className="text-right py-2 px-1">청산가</th>
                                                                <th className="text-center py-2 px-1">청산</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {aiPositions.map(pos => renderPositionRow(pos, true))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* 직접 매매 보유 내역 */}
                                    {manualPositions.length > 0 && (
                                        <Card className="bg-gray-900 border-gray-800 border-l-4 border-l-gray-500">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="flex items-center gap-2">
                                                    <span className="text-xl">👤</span>
                                                    <span>직접 매매</span>
                                                    <Badge className="bg-gray-600 text-xs">{manualPositions.length}개</Badge>
                                                </CardTitle>
                                                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                                                    <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                                                        <div className="text-gray-400 text-xs mb-1">평가금액</div>
                                                        <div className="font-semibold">${formatUSDT(manualValue)}</div>
                                                    </div>
                                                    <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                                                        <div className="text-gray-400 text-xs mb-1">미실현 손익</div>
                                                        <div className={`font-semibold ${manualPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {manualPnl >= 0 ? '+' : ''}${formatUSDT(Math.abs(manualPnl))}
                                                        </div>
                                                    </div>
                                                    <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                                                        <div className="text-gray-400 text-xs mb-1">수익률</div>
                                                        <div className={`font-semibold ${manualPnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {formatPercent(manualPnlPct)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs sm:text-sm">
                                                        <thead>
                                                            <tr className="border-b border-gray-700 text-gray-400 text-[10px]">
                                                                <th className="text-left py-2 px-1">티커</th>
                                                                <th className="text-center py-2 px-1">레버리지</th>
                                                                <th className="text-right py-2 px-1">손익</th>
                                                                <th className="text-right py-2 px-1">수익률</th>
                                                                <th className="text-right py-2 px-1">수량</th>
                                                                <th className="text-right py-2 px-1">현재가</th>
                                                                <th className="text-right py-2 px-1">매수평균가</th>
                                                                <th className="text-right py-2 px-1">매수금액</th>
                                                                <th className="text-right py-2 px-1">평가금액</th>
                                                                <th className="text-center py-2 px-1">청산</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {manualPositions.map(pos => renderPositionRow(pos, false))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Whitelist */}
                        <Card className="bg-gray-900 border-gray-800">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-6 pb-1">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                                        <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                                        감시 종목 (시총 Top 30)
                                    </CardTitle>
                                    {whitelistUpdatedAt && (
                                        <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                                            갱신: {new Date(whitelistUpdatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                                        </p>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-6 pt-2">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2">
                                    {whitelist.map((coin) => (
                                        <div
                                            key={coin.symbol}
                                            className={`p-2 sm:p-3 rounded-lg border transition-all ${coin.status === 'holding'
                                                ? 'bg-yellow-900/30 border-yellow-600'
                                                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-xs sm:text-sm">{coin.symbol.replace('USDT', '')}</span>
                                                <span className="text-[10px] text-gray-500">#{coin.rank}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400">{coin.name}</p>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[10px] sm:text-xs">${formatPrice(coin.current_price || 0)}</span>
                                                <span className={`text-[10px] sm:text-xs font-medium ${(coin.change_24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {formatPercent(coin.change_24h)}
                                                </span>
                                            </div>
                                            {coin.funding_rate !== undefined && (
                                                <div className="mt-1 text-[9px] text-gray-500">
                                                    펀딩: {coin.funding_rate >= 0 ? '+' : ''}{coin.funding_rate.toFixed(4)}%
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Logs */}
                    <div className="lg:col-span-4">
                        <Card className="bg-gray-900 border-gray-800">
                            <CardHeader className="p-2 sm:p-3 pb-1">
                                <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                                    <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
                                    Bybit 시스템 로그
                                    <Badge variant="outline" className="text-[10px] border-yellow-500/50 text-yellow-400">
                                        선물
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-2 sm:p-3">
                                <div
                                    ref={logContainerRef}
                                    className="h-[400px] sm:h-[500px] overflow-y-auto font-mono text-[10px] sm:text-xs bg-gray-950 rounded-lg p-2 space-y-1"
                                >
                                    {logs.map((log) => {
                                        const style = getLogMessageStyle(log.message);
                                        return (
                                            <div key={log.id} className="flex gap-2">
                                                <span className="text-gray-500 shrink-0">
                                                    {new Date(log.created_at).toLocaleTimeString('ko-KR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hour12: false
                                                    })}
                                                </span>
                                                <span className={`${style.className} ${style.isBold ? 'font-semibold' : ''} break-all`}>
                                                    {log.message}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {logs.length === 0 && (
                                        <div className="text-gray-500 text-center py-8">
                                            로그가 없습니다
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
