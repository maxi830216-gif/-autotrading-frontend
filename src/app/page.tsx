'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  getBotStatus,
  startBot,
  stopBot,
  panicSell,
  sellPosition,
  getWhitelist,
  getPortfolio,
  getRecentLogs,
  getPeriodReturns,
  BotStatus,
  WhitelistItem,
  PortfolioResponse,
  SystemLogEntry,
  PeriodReturns,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Settings, TrendingUp, TrendingDown, Activity, Eye, ShoppingCart, Wallet, LogOut, User, X } from 'lucide-react';
import Link from 'next/link';

function formatKRW(value: number): string {
  // 10원 미만은 소수점 8자리까지 표시 (저가 코인용)
  if (value < 10 && value > 0) {
    return value.toFixed(8).replace(/\.?0+$/, ''); // 뒤 0 제거
  }
  // 100원 미만은 소수점 2자리까지 표시 (PENGU 같은 저가 코인)
  if (value < 100) {
    return value.toFixed(2).replace(/\.?0+$/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return Math.round(value).toLocaleString();
}

function formatPercent(value: number | null): string {
  if (value === null) return '-';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

type TradingMode = 'simulation' | 'real';

export default function Dashboard() {
  const { user, logout, isLoading: authLoading } = useAuth();

  // Active tab (simulation or real)
  const [activeTab, setActiveTab] = useState<TradingMode>('simulation');

  // Bot status for each mode
  const [simulationStatus, setSimulationStatus] = useState<BotStatus | null>(null);
  const [realStatus, setRealStatus] = useState<BotStatus | null>(null);

  // Whitelist per mode (separate for instant tab switching)
  const [simulationWhitelist, setSimulationWhitelist] = useState<WhitelistItem[]>([]);
  const [realWhitelist, setRealWhitelist] = useState<WhitelistItem[]>([]);
  const [whitelistUpdatedAt, setWhitelistUpdatedAt] = useState<string | null>(null);

  // Current whitelist based on active tab (memoized)
  const whitelist = useMemo(() => {
    return activeTab === 'simulation' ? simulationWhitelist : realWhitelist;
  }, [activeTab, simulationWhitelist, realWhitelist]);

  // Portfolio per mode
  const [simulationPortfolio, setSimulationPortfolio] = useState<PortfolioResponse | null>(null);
  const [realPortfolio, setRealPortfolio] = useState<PortfolioResponse | null>(null);

  // Logs per mode
  const [simulationLogs, setSimulationLogs] = useState<SystemLogEntry[]>([]);
  const [realLogs, setRealLogs] = useState<SystemLogEntry[]>([]);

  // Period returns
  const [periodDays, setPeriodDays] = useState<number>(1);
  const [simulationReturns, setSimulationReturns] = useState<PeriodReturns | null>(null);
  const [realReturns, setRealReturns] = useState<PeriodReturns | null>(null);

  // Ref for auto-scroll
  const logContainerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);

  // Selling state for individual positions
  const [sellingCoin, setSellingCoin] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [simStatusRes, realStatusRes, simWhitelistRes, realWhitelistRes, simPortfolioRes, realPortfolioRes, simLogsRes, realLogsRes, simReturnsRes, realReturnsRes] = await Promise.all([
        getBotStatus('simulation'),
        getBotStatus('real'),
        getWhitelist('simulation'),
        getWhitelist('real'),
        getPortfolio('simulation'),
        getPortfolio('real'),
        getRecentLogs(50, 'simulation'),
        getRecentLogs(50, 'real'),
        getPeriodReturns('simulation', periodDays),
        getPeriodReturns('real', periodDays),
      ]);

      if (simStatusRes.data) setSimulationStatus(simStatusRes.data);
      if (realStatusRes.data) setRealStatus(realStatusRes.data);
      if (simWhitelistRes.data) {
        setSimulationWhitelist(simWhitelistRes.data.coins);
        setWhitelistUpdatedAt(simWhitelistRes.data.updated_at);
      }
      if (realWhitelistRes.data) {
        setRealWhitelist(realWhitelistRes.data.coins);
      }
      if (simPortfolioRes.data) setSimulationPortfolio(simPortfolioRes.data);
      if (realPortfolioRes.data) setRealPortfolio(realPortfolioRes.data);
      if (simLogsRes.data) setSimulationLogs(simLogsRes.data.logs);
      if (realLogsRes.data) setRealLogs(realLogsRes.data.logs);
      if (simReturnsRes.data) setSimulationReturns(simReturnsRes.data);
      if (realReturnsRes.data) setRealReturns(realReturnsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [periodDays]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle tab switch - clear holding status first, then fetch fresh data
  const handleTabSwitch = async (newTab: TradingMode) => {
    // 1. Clear holding status immediately (set all to 'watching')
    if (newTab === 'simulation') {
      setSimulationWhitelist(prev => prev.map(coin => ({ ...coin, status: 'watching' as const })));
    } else {
      setRealWhitelist(prev => prev.map(coin => ({ ...coin, status: 'watching' as const })));
    }

    // 2. Switch tab
    setActiveTab(newTab);

    // 3. Fetch fresh whitelist data for the new tab
    const res = await getWhitelist(newTab);
    if (res.data) {
      if (newTab === 'simulation') {
        setSimulationWhitelist(res.data.coins);
      } else {
        setRealWhitelist(res.data.coins);
      }
      setWhitelistUpdatedAt(res.data.updated_at);
    }
  };

  // Auto-scroll when logs change (keep newest logs visible at top)
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [simulationLogs, realLogs, activeTab]);

  // Helper function to style log messages
  const getLogMessageStyle = (message: string): { className: string; isBold: boolean } => {
    // 매수 관련 로그 - 초록색 볼드
    if (message.includes('매수 실행') || message.includes('매수실행')) {
      return { className: 'text-green-400', isBold: true };
    }
    // 청산/매도 관련 로그 - 빨간색 볼드
    if (message.includes('청산') || message.includes('매도')) {
      return { className: 'text-red-400', isBold: true };
    }
    // 전략 분석 완료 로그 - 볼드만
    if (message.includes('전략 분석 완료') || message.includes('매수 가능성 TOP')) {
      return { className: 'text-gray-300', isBold: true };
    }
    // 감시종목 변경 로그 - 파란색
    if (message.includes('감시종목 변경')) {
      return { className: 'text-blue-400', isBold: false };
    }
    return { className: 'text-gray-300', isBold: false };
  };

  const handleBotToggle = async (checked: boolean) => {
    if (checked) {
      await startBot(activeTab);
    } else {
      await stopBot(activeTab);
    }
    fetchData();
  };

  const handlePanicSell = async () => {
    await panicSell(activeTab);
    fetchData();
  };

  // Handle selling individual position
  const handleSellPosition = async (market: string) => {
    setSellingCoin(market);
    try {
      const result = await sellPosition(market, activeTab);
      if (result.data?.success) {
        // Refresh portfolio after successful sell
        fetchData();
      } else if (result.error) {
        console.error('Failed to sell position:', result.error);
        alert(`청산 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('Error selling position:', error);
      alert('청산 중 오류가 발생했습니다');
    } finally {
      setSellingCoin(null);
    }
  };

  // Get current status, portfolio and logs based on active tab
  const currentStatus = activeTab === 'simulation' ? simulationStatus : realStatus;
  const currentPortfolio = activeTab === 'simulation' ? simulationPortfolio : realPortfolio;
  const currentLogs = activeTab === 'simulation' ? simulationLogs : realLogs;

  // Wait for auth to be verified
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">인증 확인 중...</div>
      </div>
    );
  }

  if (loading) {
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
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg">MAXI AI Trading</h1>
              <p className="text-[10px] sm:text-xs text-orange-400">Upbit 현물</p>
            </div>

            {/* Exchange Switcher - Buttons */}
            <div className="ml-2 sm:ml-4 flex gap-1">
              <div className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 bg-orange-600 rounded-lg text-xs sm:text-sm font-medium">
                Upbit
              </div>
              <Link href="/bybit">
                <div className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs sm:text-sm text-gray-300 transition-colors">
                  Bybit
                </div>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* User Info - Hidden on mobile */}
            {user && (
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
                <User className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
            )}

            {/* Settings */}
            <Link href="/settings" onClick={() => localStorage.setItem('selectedExchange', 'upbit')}>
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
            <Link href="/history?exchange=upbit">
              <Button variant="outline" size="sm" className="h-8 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm border-gray-700 text-gray-300 hover:bg-gray-800">
                <span className="hidden sm:inline">📋 거래내역</span>
                <span className="sm:hidden">📋</span>
              </Button>
            </Link>

            {/* Logout */}
            <Button variant="ghost" size="icon" onClick={logout} title="로그아웃" className="h-8 w-8 sm:h-10 sm:w-10">
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>

            {/* Panic Sell */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700 font-bold text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10">
                  <span className="hidden sm:inline">🚨 PANIC SELL</span>
                  <span className="sm:hidden">🚨</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-gray-900 border-gray-700 mx-4 max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-500">⚠️ 긴급 매도 확인</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-300">
                    <strong>{activeTab === 'simulation' ? '모의투자' : '실전투자'}</strong> 모드의
                    모든 보유 포지션을 시장가로 즉시 매도합니다.
                    이 작업은 취소할 수 없습니다. 계속하시겠습니까?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="bg-gray-700 text-white border-gray-600">취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePanicSell} className="bg-red-600 hover:bg-red-700">
                    전량 매도 실행
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-4 sm:mb-6">
          <button
            onClick={() => handleTabSwitch('simulation')}
            className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${activeTab === 'simulation'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
          >
            📊 <span className="hidden sm:inline">모의투자</span><span className="sm:hidden">모의</span>
            <Badge className={`ml-1 sm:ml-2 text-xs ${simulationStatus?.is_running ? 'bg-green-600' : 'bg-gray-600'}`}>
              {simulationStatus?.is_running ? 'ON' : 'OFF'}
            </Badge>
          </button>
          <button
            onClick={() => handleTabSwitch('real')}
            className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${activeTab === 'real'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
          >
            💰 <span className="hidden sm:inline">실전투자</span><span className="sm:hidden">실전</span>
            <Badge className={`ml-1 sm:ml-2 text-xs ${realStatus?.is_running ? 'bg-green-600' : 'bg-gray-600'}`}>
              {realStatus?.is_running ? 'ON' : 'OFF'}
            </Badge>
          </button>
        </div>

        {/* Mode Indicator */}
        <div className={`mb-4 p-2 sm:p-3 rounded-lg border ${activeTab === 'simulation'
          ? 'bg-yellow-900/20 border-yellow-600/50'
          : 'bg-green-900/20 border-green-600/50'
          }`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className={`text-sm sm:text-lg font-bold ${activeTab === 'simulation' ? 'text-yellow-400' : 'text-green-400'
                }`}>
                {activeTab === 'simulation' ? '📊 모의투자 모드' : '💰 실전투자 모드'}
              </span>
              {activeTab === 'simulation' && (
                <span className="hidden sm:inline text-xs text-yellow-500/70">가상 ₩1,000만원으로 시뮬레이션</span>
              )}
            </div>

            {/* Bot Toggle for current mode */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-gray-400">봇</span>
              <Switch
                checked={currentStatus?.is_running || false}
                onCheckedChange={handleBotToggle}
                className={activeTab === 'simulation'
                  ? 'data-[state=checked]:bg-yellow-600'
                  : 'data-[state=checked]:bg-green-600'
                }
              />
              <Badge
                variant={currentStatus?.is_running ? 'default' : 'secondary'}
                className={currentStatus?.is_running
                  ? (activeTab === 'simulation' ? 'bg-yellow-600' : 'bg-green-600')
                  : ''
                }
              >
                {currentStatus?.is_running ? 'ON' : 'OFF'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Left Column - Status & Whitelist */}
          <div className="lg:col-span-8 space-y-4 sm:space-y-6">
            {/* Portfolio Cards - Compact 4-column layout */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-1 p-2 sm:p-3 sm:pb-1">
                  <CardTitle className="text-[10px] sm:text-xs font-medium text-gray-400 flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    전체 자산
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-3 pt-0">
                  <p className="text-sm sm:text-lg font-bold truncate">₩{Math.round(currentPortfolio?.total_asset_value || 0).toLocaleString()}</p>
                  {/* Cash/Coin Ratio Bar */}
                  {(() => {
                    const total = currentPortfolio?.total_asset_value || 0;
                    const cash = currentPortfolio?.krw_balance || 0;
                    const coin = total - cash;
                    const cashPercent = total > 0 ? (cash / total) * 100 : 100;
                    return (
                      <div className="mt-1.5">
                        {/* Progress Bar */}
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden flex">
                          <div
                            className="bg-yellow-500 h-full transition-all duration-300"
                            style={{ width: `${cashPercent}%` }}
                          />
                          <div
                            className="bg-blue-500 h-full transition-all duration-300"
                            style={{ width: `${100 - cashPercent}%` }}
                          />
                        </div>
                        {/* Labels */}
                        <div className="flex justify-between mt-1 text-[9px] sm:text-[10px]">
                          <span className="text-yellow-400 font-medium">
                            💵 ₩{formatKRW(cash)}
                          </span>
                          <span className="text-blue-400">
                            🪙 ₩{formatKRW(coin)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-1 p-2 sm:p-3 sm:pb-1">
                  <CardTitle className="text-[10px] sm:text-xs font-medium text-gray-400 flex items-center gap-1">
                    {(() => {
                      const unrealizedPnl = currentPortfolio?.positions?.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0) || 0;
                      return unrealizedPnl >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-500" />
                      );
                    })()}
                    미실현 손익
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-3 pt-0">
                  {(() => {
                    const unrealizedPnl = currentPortfolio?.positions?.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0) || 0;
                    const positionsLength = currentPortfolio?.positions?.length || 1;
                    const unrealizedPercent = (currentPortfolio?.positions?.reduce((sum, p) => sum + (p.unrealized_pnl_percent || 0), 0) || 0) / positionsLength;
                    return (
                      <>
                        <p className={`text-sm sm:text-lg font-bold truncate ${unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {unrealizedPnl >= 0 ? '+' : ''}₩{Math.round(Math.abs(unrealizedPnl)).toLocaleString()}
                        </p>
                        <p className={`text-[10px] mt-0.5 ${unrealizedPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatPercent(unrealizedPercent)}
                        </p>
                      </>
                    );
                  })()}
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
                  <p className="text-sm sm:text-lg font-bold">{currentPortfolio?.positions?.length || 0}개</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">활성 상태</p>
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
                    const returns = activeTab === 'simulation' ? simulationReturns : realReturns;
                    const pnl = returns?.total_pnl || 0;
                    const pnlPercent = returns?.pnl_percent || 0;
                    return (
                      <>
                        <p className={`text-sm sm:text-lg font-bold truncate ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {pnl >= 0 ? '+' : ''}₩{Math.round(Math.abs(pnl)).toLocaleString()}
                        </p>
                        <p className={`text-[10px] mt-0.5 ${pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatPercent(pnlPercent)} ({returns?.trade_count || 0}건)
                        </p>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Positions (보유 내역) - Split by source */}
            {currentPortfolio?.positions && currentPortfolio.positions.length > 0 && (() => {
              const aiPositions = currentPortfolio.positions.filter(p => p.source === 'ai');
              const manualPositions = currentPortfolio.positions.filter(p => p.source === 'manual');

              const getStrategyLabel = (strategy: string | null | undefined) => {
                switch (strategy) {
                  case 'squirrel': return '🐿️ 다람쥐';
                  case 'morning': return '⭐ 샛별형';
                  case 'hammer': return '🔨 망치형';
                  case 'inverted_hammer': return '🔨 윗꼬리양봉';
                  case 'divergence': return '📊 다이버전스';
                  case 'harmonic': return '🎯 하모닉';
                  case 'leading_diagonal': return '📐 리딩다이아';
                  default: return strategy || '-';
                }
              };

              const renderPositionsTable = (positions: typeof currentPortfolio.positions, showStrategy: boolean = false) => (
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <table className="w-full text-xs sm:text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b border-gray-700 text-gray-400 text-[10px]">
                        <th className="text-left py-2 px-1">티커</th>
                        {showStrategy && <th className="text-left py-2 px-1">전략</th>}
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
                      {[...positions].sort((a, b) => {
                        const valueA = (a.current_price || 0) * a.balance;
                        const valueB = (b.current_price || 0) * b.balance;
                        return valueB - valueA; // 높은 순
                      }).map((pos) => {
                        const buyAmount = pos.avg_buy_price * pos.balance;
                        const currentValue = (pos.current_price || 0) * pos.balance;
                        return (
                          <tr key={pos.coin} className="border-b border-gray-800 hover:bg-gray-800/50">
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${pos.source === 'ai'
                                  ? 'bg-gradient-to-br from-purple-500 to-blue-600'
                                  : 'bg-gradient-to-br from-green-500 to-teal-600'
                                  }`}>
                                  {pos.coin.replace('KRW-', '').slice(0, 2)}
                                </div>
                                <span className="font-medium">{pos.coin.replace('KRW-', '')}</span>
                              </div>
                            </td>
                            {showStrategy && (
                              <td className="py-3 px-2">
                                <Badge variant="outline" className="text-[10px] border-purple-500/50 text-purple-300">
                                  {getStrategyLabel(pos.strategy)}
                                </Badge>
                              </td>
                            )}
                            <td className={`text-right py-3 px-2 font-medium ${(pos.unrealized_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {(pos.unrealized_pnl || 0) >= 0 ? '+' : ''}₩{formatKRW(Math.abs(pos.unrealized_pnl || 0))}
                            </td>
                            <td className={`text-right py-3 px-2 font-bold ${(pos.unrealized_pnl_percent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercent(pos.unrealized_pnl_percent)}
                            </td>
                            <td className="text-right py-3 px-2 text-gray-300">
                              {pos.balance.toFixed(4)}
                            </td>
                            <td className="text-right py-3 px-1 text-blue-400">
                              ₩{formatKRW(pos.current_price || pos.avg_buy_price)}
                            </td>
                            <td className="text-right py-3 px-1 text-gray-300">
                              ₩{formatKRW(pos.avg_buy_price)}
                            </td>
                            <td className="text-right py-3 px-1 text-gray-300">
                              ₩{Math.round(buyAmount).toLocaleString()}
                            </td>
                            <td className="text-right py-3 px-2 font-medium">
                              ₩{Math.round(currentValue).toLocaleString()}
                            </td>
                            <td className="text-center py-3 px-2">
                              {pos.can_sell === false ? (
                                <span
                                  className="text-xs text-gray-500 cursor-help"
                                  title="평가금액 5,000원 미만은 업비트 최소 주문 제한으로 청산 불가"
                                >
                                  소액
                                </span>
                              ) : (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-3 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50 bg-transparent transition-colors"
                                      disabled={sellingCoin === pos.coin}
                                    >
                                      {sellingCoin === pos.coin ? (
                                        <span className="animate-spin mr-1">⏳</span>
                                      ) : null}
                                      청산
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-gray-900 border-gray-700 mx-4 max-w-md">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-red-500">⚠️ 포지션 청산 확인</AlertDialogTitle>
                                      <AlertDialogDescription className="text-gray-300">
                                        <strong>{pos.coin.replace('KRW-', '')}</strong> 포지션을 시장가로 즉시 청산합니다.
                                        <br />
                                        <span className="text-sm text-gray-400">
                                          수량: {pos.balance.toFixed(4)} | 평가금액: ₩{Math.round(currentValue).toLocaleString()}
                                        </span>
                                        <br /><br />
                                        계속하시겠습니까?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                      <AlertDialogCancel className="bg-gray-700 text-white border-gray-600">취소</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleSellPosition(pos.coin)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        청산 실행
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );

              const calculateSummary = (positions: typeof currentPortfolio.positions) => {
                const totalBuyAmount = positions.reduce((sum, p) => sum + p.avg_buy_price * p.balance, 0);
                const totalCurrentValue = positions.reduce((sum, p) => sum + (p.current_price || 0) * p.balance, 0);
                const totalPnl = positions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);
                const avgPnlPercent = totalBuyAmount > 0 ? (totalPnl / totalBuyAmount) * 100 : 0;
                return { totalBuyAmount, totalCurrentValue, totalPnl, avgPnlPercent };
              };

              return (
                <div className="space-y-4">
                  {/* AI 매매 보유 내역 */}
                  {aiPositions.length > 0 && (
                    <Card className="bg-gray-900 border-gray-800 border-l-4 border-l-purple-500">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <span className="text-xl">🤖</span>
                            <span>AI 매매</span>
                            <Badge className="bg-purple-600 text-xs">{aiPositions.length}개</Badge>
                          </CardTitle>
                          <Link href="/history?exchange=upbit">
                            <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800 text-xs sm:text-sm h-8">
                              거래 내역 →
                            </Button>
                          </Link>
                        </div>
                        {(() => {
                          const summary = calculateSummary(aiPositions);
                          return (
                            <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                              <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                                <div className="text-gray-400 text-xs mb-1">평가금액</div>
                                <div className="font-semibold">₩{formatKRW(summary.totalCurrentValue)}</div>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                                <div className="text-gray-400 text-xs mb-1">미실현 손익</div>
                                <div className={`font-semibold ${summary.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {summary.totalPnl >= 0 ? '+' : ''}₩{formatKRW(Math.abs(summary.totalPnl))}
                                </div>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                                <div className="text-gray-400 text-xs mb-1">수익률</div>
                                <div className={`font-semibold ${summary.avgPnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {formatPercent(summary.avgPnlPercent)}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </CardHeader>
                      <CardContent>
                        {renderPositionsTable(aiPositions, true)}
                      </CardContent>
                    </Card>
                  )}

                  {/* 직접 매매 보유 내역 */}
                  {manualPositions.length > 0 && (
                    <Card className="bg-gray-900 border-gray-800 border-l-4 border-l-teal-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                          <span className="text-xl">👤</span>
                          <span>직접 매매</span>
                          <Badge className="bg-teal-600 text-xs">{manualPositions.length}개</Badge>
                        </CardTitle>
                        {(() => {
                          const summary = calculateSummary(manualPositions);
                          return (
                            <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                              <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                                <div className="text-gray-400 text-xs mb-1">평가금액</div>
                                <div className="font-semibold">₩{formatKRW(summary.totalCurrentValue)}</div>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                                <div className="text-gray-400 text-xs mb-1">미실현 손익</div>
                                <div className={`font-semibold ${summary.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {summary.totalPnl >= 0 ? '+' : ''}₩{formatKRW(Math.abs(summary.totalPnl))}
                                </div>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                                <div className="text-gray-400 text-xs mb-1">수익률</div>
                                <div className={`font-semibold ${summary.avgPnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {formatPercent(summary.avgPnlPercent)}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </CardHeader>
                      <CardContent>
                        {renderPositionsTable(manualPositions, false)}
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
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                    감시 종목 (Top 50)
                  </CardTitle>
                  {whitelistUpdatedAt && (
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                      갱신: {new Date(whitelistUpdatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2">
                  {whitelist.map((coin) => (
                    <div
                      key={coin.market}
                      className={`p-2 sm:p-3 rounded-lg border transition-all ${coin.status === 'holding'
                        ? 'bg-blue-900/30 border-blue-600'
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <span className="font-medium text-xs sm:text-sm">{coin.market.replace('KRW-', '')}</span>
                        {coin.status === 'holding' ? (
                          <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                        ) : (
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs text-gray-400 truncate">{coin.korean_name}</p>
                      <div className="flex items-center justify-between mt-1 sm:mt-2">
                        <span className="text-[10px] sm:text-xs">₩{formatKRW(coin.current_price || 0)}</span>
                        <span className={`text-[10px] sm:text-xs font-medium ${(coin.change_rate || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatPercent(coin.change_rate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Log Terminal */}
          <div className="lg:col-span-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="p-2 sm:p-3 pb-1 sm:pb-2">
                <CardTitle className="flex items-center gap-2 text-xs sm:text-sm">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${activeTab === 'simulation' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                  {activeTab === 'simulation' ? '모의투자' : '실전투자'} 로그
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-3 pt-0">
                <div ref={logContainerRef} className="bg-black rounded-lg p-2 sm:p-3 h-[300px] sm:h-[400px] lg:h-[500px] overflow-y-auto font-mono text-[10px] sm:text-xs">
                  {currentLogs.map((log) => {
                    const msgStyle = getLogMessageStyle(log.message);
                    return (
                      <div key={log.id} className="py-1 border-b border-gray-800/50">
                        <span className="text-gray-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                        {/* Only show level if it's NOT INFO */}
                        {log.level !== 'INFO' && (
                          <span className={`mx-1 sm:mx-2 ${log.level === 'ERROR' ? 'text-red-400' :
                            log.level === 'WARNING' ? 'text-yellow-400' : 'text-blue-400'
                            }`}>
                            [{log.level}]
                          </span>
                        )}
                        {/* Remove KRW- prefix and add left margin if no level tag */}
                        <span className={`${msgStyle.className} ${msgStyle.isBold ? 'font-bold' : ''} break-all ${log.level === 'INFO' ? 'ml-2' : ''}`}>
                          {log.message.replace(/KRW-/g, '')}
                        </span>
                      </div>
                    );
                  })}
                  {currentLogs.length === 0 && (
                    <div className="text-gray-500 text-center py-8">로그 없음</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main >
    </div >
  );
}
