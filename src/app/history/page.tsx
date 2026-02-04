'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { getTradeHistory, TradeLog, TradeHistoryParams, getReturnsChart, ReturnsChartResponse, getBybitHistory, BybitTradeLog, getBybitReturnsChart } from '@/lib/api';
import { ArrowLeft, TrendingUp, TrendingDown, Search, HelpCircle, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TradeChartModal } from '@/components/TradeChartModal';

type ExchangeType = 'upbit' | 'bybit';

function formatKRW(value: number): string {
    // 10원 미만은 소수점 8자리까지 표시 (저가 코인용)
    if (value < 10 && value > 0) {
        return value.toFixed(8).replace(/\.?0+$/, ''); // 뒤 0 제거
    }
    // 100원 미만은 소수점 2자리까지 표시 (PENGU 같은 저가 코인)
    if (value < 100) {
        return value.toFixed(2).replace(/\.?0+$/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return Math.round(value).toLocaleString('ko-KR');
}

function formatUSDT(value: number): string {
    if (value < 1) {
        return value.toFixed(4);
    }
    return value.toFixed(2);
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

// KRW-BTC -> BTC, BTCUSDT -> BTC 변환
function formatCoinName(coin: string, exchange: ExchangeType): string {
    if (exchange === 'bybit') {
        return coin.replace('USDT', '');
    }
    return coin.replace('KRW-', '');
}

// side 값을 한글로 변환
function getSideInfo(side: string): { label: string; isLong: boolean } {
    switch (side) {
        case 'buy':
            return { label: '매수', isLong: true };
        case 'sell':
            return { label: '매도', isLong: false };
        case 'long_open':
            return { label: '롱진입', isLong: true };
        case 'long_close':
            return { label: '롱청산', isLong: false };
        case 'short_open':
            return { label: '숏진입', isLong: false };
        case 'short_close':
            return { label: '숏청산', isLong: true };
        default:
            return { label: side, isLong: side.includes('buy') || side.includes('long') };
    }
}

function getStrategyLabel(strategy: string, timeframe?: string): string {
    let label = '';
    switch (strategy) {
        case 'squirrel': label = '상승 다람쥐'; break;
        case 'morning': label = '샛별형'; break;
        case 'inverted_hammer': label = '윗꼬리양봉'; break;
        case 'divergence': label = '다이버전스'; break;
        case 'harmonic': label = '하모닉'; break;
        case 'leading_diagonal': label = '리딩다이아'; break;
        case 'manual': label = '수동'; break;
        default: label = strategy;
    }

    // 타임프레임 표시 추가
    if (timeframe) {
        const tfLabel = timeframe === 'day' || timeframe === '1D' ? '1D' :
            timeframe === 'minute240' || timeframe === '4H' ? '4H' : timeframe;
        return `${label}(${tfLabel})`;
    }
    return label;
}

// 거래 사유를 유저 친화적으로 변환
interface ReasonInfo {
    label: string;
    emoji: string;
    description: string;
    details: string;
}

function getReasonInfo(reason: string | null, side: string, strategy?: string): ReasonInfo {
    // 매수 사유
    const buyReasons: Record<string, ReasonInfo> = {
        'entry_squirrel': {
            label: '다람쥐 진입',
            emoji: '🐿️',
            description: '최근에 이 코인이 크게 상승한 적이 있어요!',
            details: '과거에 가격이 크게 오른 날이 있었고(기관 매수 신호), 지금은 잠시 조정을 받으며 쉬고 있는 상태예요. 거래량이 줄어든 것은 "팔 사람은 다 팔았다"는 뜻이에요. 조용히 힘을 모은 후 다시 상승할 가능성이 높아서 매수했어요.'
        },
        'entry_morning': {
            label: '샛별형 진입',
            emoji: '⭐',
            description: '어두운 밤(하락) 뒤에 새벽(반등)이 올 것 같아요!',
            details: '가격이 계속 떨어지다가 바닥을 찍고 반등하는 패턴이 나타났어요. 마치 롤러코스터가 내려가다가 바닥을 찍고 다시 올라가는 것처럼요. 기술적으로 바닥 신호가 나타나서 매수했어요.'
        },
        'entry_inverted_hammer': {
            label: '윗꼬리양봉 진입',
            emoji: '🔨',
            description: '하락하다가 강한 반등 신호가 나타났어요!',
            details: '가격이 떨어지던 중, 한 번 크게 올랐다가 내려온 캔들(긴 윗꼬리)이 나타났어요. 이건 "매수세가 들어오고 있다"는 신호예요. 바닥 근처에서 이 신호가 나오면 반등할 가능성이 높아서 매수했어요.'
        },
        'entry_divergence': {
            label: '다이버전스 진입',
            emoji: '📊',
            description: '가격은 내려갔는데 지표는 올라갔어요!',
            details: 'RSI가 가격과 반대로 움직이는 "다이버전스"가 발생했어요. 이건 하락세가 힘을 잃고 있다는 강력한 반등 신호예요.'
        },
        'entry_harmonic': {
            label: '하모닉 진입',
            emoji: '🎯',
            description: '피보나치 반전 포인트(D점)에 도달했어요!',
            details: '가격이 수학적으로 계산된 정확한 반전 지점에 도달했어요. 가틀리/배트 패턴의 D점은 높은 확률로 반등이 시작되는 자리예요.'
        },
        'entry_leading_diagonal': {
            label: '리딩다이아 진입',
            emoji: '📐',
            description: '하락 쐐기 패턴을 상단 돌파했어요!',
            details: '가격이 삼각형 모양으로 수렴하다가 위쪽으로 터져나왔어요. 새로운 상승 추세가 시작되는 강력한 신호예요.'
        },
        // Bybit specific patterns (reason contains strategy name)
        'divergence': {
            label: '다이버전스 롱',
            emoji: '📊',
            description: '가격은 내려갔는데 지표는 올라갔어요!',
            details: 'RSI가 가격과 반대로 움직이는 "다이버전스"가 발생했어요. 이건 하락세가 힘을 잃고 있다는 강력한 반등 신호예요. (Bybit 5x 레버리지)'
        },
        'harmonic': {
            label: '하모닉 롱',
            emoji: '🎯',
            description: '피보나치 반전 포인트(D점)에 도달했어요!',
            details: '가격이 수학적으로 계산된 정확한 반전 지점에 도달했어요. 가틀리/배트 패턴의 D점은 높은 확률로 반등이 시작되는 자리예요. (Bybit 5x 레버리지)'
        },
        'leading_diagonal': {
            label: '리딩다이아 롱',
            emoji: '📐',
            description: '하락 쐐기 패턴을 상단 돌파했어요!',
            details: '가격이 삼각형 모양으로 수렴하다가 위쪽으로 터져나왔어요. 새로운 상승 추세가 시작되는 강력한 신호예요. (Bybit 5x 레버리지)'
        },
        'squirrel': {
            label: '다람쥐 롱',
            emoji: '🐿️',
            description: '최근에 크게 상승한 적이 있어요!',
            details: '과거에 가격이 크게 오른 날이 있었고, 지금은 잠시 조정을 받으며 쉬고 있는 상태예요. (Bybit 5x 레버리지)'
        },
        'morning': {
            label: '샛별형 롱',
            emoji: '⭐',
            description: '하락 뒤에 반등이 올 것 같아요!',
            details: '가격이 계속 떨어지다가 바닥을 찍고 반등하는 패턴이 나타났어요. (Bybit 5x 레버리지)'
        },
        'inverted_hammer': {
            label: '윗꼬리양봉 롱',
            emoji: '🔨',
            description: '강한 반등 신호가 나타났어요!',
            details: '가격이 떨어지던 중, 한 번 크게 올랐다가 내려온 캔들이 나타났어요. (Bybit 5x 레버리지)'
        },
    };

    // 숏 진입 사유 (Bybit)
    const shortReasons: Record<string, ReasonInfo> = {
        'bearish_divergence': {
            label: '하락 다이버전스',
            emoji: '📉',
            description: '가격과 지표가 엇갈리고 있어요! 하락 가능성이 높아요.',
            details: '가격은 높은 고점을 찍었는데, RSI 지표는 낮은 고점을 찍었어요. 이건 상승 힘이 약해지고 있다는 의미예요. 곧 가격이 떨어질 가능성이 높아서 숏 진입했어요. (Bybit 5x 레버리지)'
        },
        'evening_star': {
            label: '석양형',
            emoji: '🌅',
            description: '상승 후 반전 신호가 나타났어요!',
            details: '3개의 캔들이 연속으로 나타나서 "상승→망설임→하락" 패턴을 보였어요. 해가 지듯이 상승 추세가 끝나고 하락이 시작될 신호예요. (Bybit 5x 레버리지)'
        },
        'shooting_star': {
            label: '유성형',
            emoji: '💫',
            description: '위로 쏘았다가 다시 내려온 캔들이에요!',
            details: '가격이 한 번 크게 올랐다가 다시 떨어진 캔들이 나타났어요. 위쪽에서 강한 저항을 받았다는 의미로, 하락 가능성이 높아요. (Bybit 5x 레버리지)'
        },
        'bearish_engulfing': {
            label: '하락 장악형',
            emoji: '🐻',
            description: '큰 음봉이 이전 양봉을 완전히 덮었어요!',
            details: '작은 양봉 다음에 훨씬 큰 음봉이 나타나서 완전히 덮어버렸어요. 매도 세력이 강하게 장악했다는 의미로, 하락 추세로 전환될 신호예요. (Bybit 5x 레버리지)'
        },
        'breakdown': {
            label: '이탈 하락',
            emoji: '📐',
            description: '지지선을 뚫고 하락했어요!',
            details: '가격이 삼각형 모양으로 수렴하다가 아래쪽으로 뚫렸어요. 새로운 하락 추세가 시작되는 강력한 신호예요. (Bybit 5x 레버리지)'
        },
    };

    // 매도 사유 (★ Phase 9: 100% 청산 구조로 단순화)
    const sellReasons: Record<string, ReasonInfo> = {
        // ★ 100% 청산: 단일 익절/손절
        'take_profit': {
            label: '익절',
            emoji: '💰',
            description: '익절 목표가에 도달했어요!',
            details: '매수할 때 설정한 목표가(TP)에 도달해서 전량 청산했어요. 수익을 확정하는 것이 중요해요!'
        },
        '익절': {
            label: '익절',
            emoji: '💰',
            description: '익절 목표가에 도달했어요!',
            details: '매수할 때 설정한 목표가(TP)에 도달해서 전량 청산했어요. 수익을 확정하는 것이 중요해요!'
        },
        'stop_loss': {
            label: '손절',
            emoji: '🛑',
            description: '손절가에 도달해서 손실을 제한했어요.',
            details: '매수할 때 설정한 손절가(SL)에 도달해서 전량 청산했어요. 더 큰 손실을 막기 위해 빠르게 정리했어요. 손절은 나쁜 게 아니라, 자산을 지키는 현명한 선택이에요!'
        },
        '손절': {
            label: '손절',
            emoji: '🛑',
            description: '손절가에 도달해서 손실을 제한했어요.',
            details: '매수할 때 설정한 손절가(SL)에 도달해서 전량 청산했어요. 더 큰 손실을 막기 위해 빠르게 정리했어요. 손절은 나쁜 게 아니라, 자산을 지키는 현명한 선택이에요!'
        },
        // 긴급 매도
        'panic_sell': {
            label: '긴급매도',
            emoji: '🚨',
            description: '긴급 전량 매도를 실행했어요.',
            details: '사용자가 직접 "전량 매도" 버튼을 눌러서 모든 코인을 즉시 팔았어요.'
        },
        '수동 청산': {
            label: '수동 청산',
            emoji: '👆',
            description: '사용자가 직접 청산했어요.',
            details: '사용자가 직접 청산 버튼을 눌러서 포지션을 정리했어요.'
        },
        // ★ Phase 9: invalidation 로직 제거됨 (SL/TP만 사용)
    };

    // reason에서 추가 정보 제거 (예: "stop_loss (lost -2.5%)" -> "stop_loss")
    const baseReason = reason?.split(' ')[0].split('(')[0].trim() || '';

    // 매수인 경우
    if (side === 'buy' || side === 'long_open') {
        if (reason && buyReasons[reason]) {
            return buyReasons[reason];
        }
        // entry_strategy 형태 체크
        if (baseReason.startsWith('entry_') && buyReasons[baseReason]) {
            return buyReasons[baseReason];
        }
        // Bybit: strategy 이름으로 매칭 (reason이 "divergence 매수 신호" 형태일 때)
        if (strategy && buyReasons[strategy]) {
            return buyReasons[strategy];
        }
        // baseReason에서 strategy 이름 추출 시도
        if (baseReason && buyReasons[baseReason]) {
            return buyReasons[baseReason];
        }
        // 기본 매수 사유
        return {
            label: side === 'long_open' ? '롱 진입' : '진입',
            emoji: '📈',
            description: '전략 조건 충족! 좋은 매수 기회예요.',
            details: '봇이 분석한 결과, 이 코인이 상승할 가능성이 높다고 판단해서 매수했어요.'
        };
    }

    // 숏 진입인 경우 (Bybit)
    if (side === 'short_open') {
        // strategy 이름으로 매칭
        if (strategy && shortReasons[strategy]) {
            return shortReasons[strategy];
        }
        // baseReason에서 strategy 이름 추출 시도
        if (baseReason && shortReasons[baseReason]) {
            return shortReasons[baseReason];
        }
        // 기본 숏 진입 사유
        return {
            label: '숏 진입',
            emoji: '📉',
            description: '하락 신호 감지! 숏 포지션을 잡았어요.',
            details: '봇이 분석한 결과, 이 코인이 하락할 가능성이 높다고 판단해서 숏 진입했어요. (Bybit 5x 레버리지)'
        };
    }

    // 매도인 경우
    if (reason && sellReasons[baseReason]) {
        return sellReasons[baseReason];
    }


    // ★ Phase 9: 전략무효 로직 제거 (SL/TP만 사용)


    // 기본 매도 사유
    if (!reason) {
        return {
            label: '-',
            emoji: '',
            description: '',
            details: ''
        };
    }

    return {
        label: reason,
        emoji: '📝',
        description: `사유: ${reason}`,
        details: '상세 정보가 없습니다.'
    };
}

export default function HistoryPage() {
    // Read exchange from URL params (e.g., /history?exchange=bybit)
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const initialExchange = (searchParams?.get('exchange') as ExchangeType) || 'upbit';

    const [exchange, setExchange] = useState<ExchangeType>(initialExchange);
    const [logs, setLogs] = useState<TradeLog[]>([]);
    const [bybitLogs, setBybitLogs] = useState<BybitTradeLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<TradeHistoryParams>({
        limit: 50,
        offset: 0,
    });
    const [searchCoin, setSearchCoin] = useState('');
    const [selectedReason, setSelectedReason] = useState<{ log: TradeLog | BybitTradeLog, info: ReasonInfo, exchange: ExchangeType } | null>(null);
    const [chartData, setChartData] = useState<ReturnsChartResponse | null>(null);
    const [chartLoading, setChartLoading] = useState(false);
    const [selectedChartTrade, setSelectedChartTrade] = useState<{ id: number; type: 'trade' | 'position' } | null>(null);


    const fetchChartData = async () => {
        setChartLoading(true);
        const params: { mode?: string; strategy?: string } = {};
        if (filters.mode) params.mode = filters.mode;
        if (filters.strategy) params.strategy = filters.strategy;

        let result;
        if (exchange === 'bybit') {
            result = await getBybitReturnsChart(params);
        } else {
            result = await getReturnsChart(params);
        }

        if (result.data) {
            setChartData(result.data);
        } else {
            setChartData(null);
        }
        setChartLoading(false);
    };


    const fetchHistory = async () => {
        setLoading(true);

        if (exchange === 'upbit') {
            const params = { ...filters, exchange: 'upbit' };
            if (searchCoin) params.coin = searchCoin;

            const result = await getTradeHistory(params);
            if (result.data) {
                setLogs(result.data.logs);
                setTotal(result.data.total);
            }
        } else {
            // Bybit
            const params: { mode?: string; strategy?: string; side?: string; limit?: number; offset?: number } = {
                limit: filters.limit,
                offset: filters.offset,
            };
            if (filters.mode) params.mode = filters.mode;
            if (filters.strategy) params.strategy = filters.strategy;
            if (filters.side) params.side = filters.side;  // ★ side 필터 추가

            const result = await getBybitHistory(params);
            if (result.data) {
                setBybitLogs(result.data.logs);
                setTotal(result.data.total);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchHistory();
        fetchChartData();
    }, [filters, exchange]);


    const handleSearch = () => {
        setFilters(prev => ({ ...prev, offset: 0 }));
        fetchHistory();
    };

    const handleModeFilter = (mode: string) => {
        if (mode === 'all') {
            const { mode: _, ...rest } = filters;
            setFilters({ ...rest, offset: 0 });
        } else {
            setFilters(prev => ({ ...prev, mode, offset: 0 }));
        }
    };

    const handleStrategyFilter = (strategy: string) => {
        if (strategy === 'all') {
            const { strategy: _, ...rest } = filters;
            setFilters({ ...rest, offset: 0 });
        } else {
            setFilters(prev => ({ ...prev, strategy, offset: 0 }));
        }
    };

    const handleExchangeFilter = (exchange: string) => {
        if (exchange === 'all') {
            const { exchange: _, ...rest } = filters;
            setFilters({ ...rest, offset: 0 });
        } else {
            setFilters(prev => ({ ...prev, exchange, offset: 0 }));
        }
    };

    const handleSideFilter = (side: string) => {
        if (side === 'all') {
            const { side: _, ...rest } = filters;
            setFilters({ ...rest, offset: 0 });
        } else {
            setFilters(prev => ({ ...prev, side, offset: 0 }));
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
                    <Link href={exchange === 'bybit' ? '/bybit' : '/'}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                    </Link>
                    <h1 className="font-bold text-base sm:text-lg">거래 내역</h1>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
                {/* Exchange Tabs */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => { setExchange('upbit'); setFilters(prev => ({ ...prev, offset: 0 })); }}
                        className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${exchange === 'upbit'
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        🔸 Upbit
                    </button>
                    <button
                        onClick={() => { setExchange('bybit'); setFilters(prev => ({ ...prev, offset: 0 })); }}
                        className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${exchange === 'bybit'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        🔶 Bybit
                    </button>
                </div>

                <Card className="bg-gray-900 border-gray-800">
                    <CardHeader className="p-3 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                {exchange === 'upbit' ? '🔸 Upbit' : '🔶 Bybit'} Trade History
                            </CardTitle>
                            <div className="flex items-center gap-2 sm:gap-4">
                                {exchange === 'upbit' && (
                                    <div className="relative flex-1 sm:flex-none">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <Input
                                            placeholder="코인 검색..."
                                            value={searchCoin}
                                            onChange={(e) => setSearchCoin(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                            className="pl-9 bg-gray-800 border-gray-700 w-full sm:w-40"
                                        />
                                    </div>
                                )}
                                <Badge variant="secondary" className="bg-gray-700 whitespace-nowrap">
                                    {total}건
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6">
                        {/* Filters */}
                        <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
                            <Tabs defaultValue="all" onValueChange={handleModeFilter}>
                                <TabsList className="bg-gray-800 h-8 sm:h-10">
                                    <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3">전체</TabsTrigger>
                                    <TabsTrigger value="real" className="text-xs sm:text-sm px-2 sm:px-3">실전</TabsTrigger>
                                    <TabsTrigger value="simulation" className="text-xs sm:text-sm px-2 sm:px-3">모의</TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {/* 전략 필터 - 드롭다운 */}
                            <select
                                onChange={(e) => handleStrategyFilter(e.target.value)}
                                className="bg-gray-800 border border-gray-700 text-white rounded-md h-8 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm"
                            >
                                <option value="all">전략: 전체</option>
                                <option value="squirrel">🐿️ 다람쥐</option>
                                <option value="morning">⭐ 샛별형</option>
                                <option value="inverted_hammer">🔨 윗꼬리양봉</option>
                                <option value="divergence">📊 다이버전스</option>
                                <option value="harmonic">🎯 하모닉</option>
                                <option value="leading_diagonal">📐 리딩다이아</option>
                            </select>


                            <Tabs defaultValue="all" onValueChange={handleSideFilter}>
                                <TabsList className="bg-gray-800 h-8 sm:h-10">
                                    <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3">전체</TabsTrigger>
                                    <TabsTrigger value="buy" className="text-xs sm:text-sm px-2 sm:px-3">매수</TabsTrigger>
                                    <TabsTrigger value="sell" className="text-xs sm:text-sm px-2 sm:px-3">매도</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Returns Chart */}
                        {chartLoading ? (
                            <div className="mb-6 p-8 bg-gray-800/50 rounded-lg border border-gray-700 flex items-center justify-center">
                                <p className="text-gray-500">차트 로딩 중...</p>
                            </div>
                        ) : chartData && chartData.data_points.length > 0 ? (
                            <div className="mb-6 p-4 sm:p-6 bg-gray-800/50 rounded-lg border border-gray-700">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                                    <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-0">
                                        {exchange === 'upbit' ? '📈 누적 수익금액 (원)' : '📈 누적 수익금액 (USDT)'}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-400">총 거래: </span>
                                            <span className="text-white font-medium">{chartData.total_trades}건</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">총 수익: </span>
                                            <span className={`font-bold ${chartData.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {chartData.total_pnl >= 0 ? '+' : ''}
                                                {exchange === 'upbit'
                                                    ? `₩${Math.round(chartData.total_pnl).toLocaleString()}`
                                                    : `$${chartData.total_pnl.toFixed(2)}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart
                                        data={chartData.data_points.map(point => ({
                                            ...point,
                                            date: new Date(point.timestamp).toLocaleDateString('ko-KR', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit'
                                            })
                                        }))}
                                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#9CA3AF"
                                            style={{ fontSize: '12px' }}
                                        />
                                        <YAxis
                                            stroke="#9CA3AF"
                                            style={{ fontSize: '12px' }}
                                            tickFormatter={(value) => exchange === 'upbit'
                                                ? (value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toFixed(0))
                                                : `$${value.toFixed(0)}`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1F2937',
                                                border: '1px solid #374151',
                                                borderRadius: '8px',
                                                color: '#fff'
                                            }}
                                            formatter={(value: number | undefined) => value !== undefined
                                                ? [exchange === 'upbit'
                                                    ? `₩${Math.round(value).toLocaleString()}`
                                                    : `$${value.toFixed(2)}`, '누적 수익금액']
                                                : ['-', '누적 수익금액']}
                                            labelFormatter={(label) => `시간: ${label}`}
                                        />
                                        <Legend
                                            wrapperStyle={{ color: '#9CA3AF' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="cumulative_pnl"
                                            stroke="#10B981"
                                            strokeWidth={2}
                                            dot={{ fill: '#10B981', r: 3 }}
                                            activeDot={{ r: 5 }}
                                            name={exchange === 'upbit' ? '누적 수익 (원)' : '누적 수익 (USDT)'}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="mb-6 p-8 bg-gray-800/50 rounded-lg border border-gray-700 flex items-center justify-center">
                                <p className="text-gray-500">매도 거래 내역이 없어 차트를 표시할 수 없습니다</p>
                            </div>
                        )}

                        {/* Table */}
                        <div className="rounded-lg border border-gray-800 overflow-x-auto -mx-3 sm:mx-0">
                            <Table className="min-w-[900px]">
                                <TableHeader>
                                    <TableRow className="bg-gray-800/50 hover:bg-gray-800/50">
                                        <TableHead className="text-gray-400 text-xs sm:text-sm">시간</TableHead>
                                        <TableHead className="text-gray-400 text-xs sm:text-sm">모드</TableHead>
                                        <TableHead className="text-gray-400 text-xs sm:text-sm">전략</TableHead>
                                        <TableHead className="text-gray-400 text-xs sm:text-sm">종목</TableHead>
                                        <TableHead className="text-gray-400 text-xs sm:text-sm">구분</TableHead>
                                        <TableHead className="text-gray-400 text-xs sm:text-sm">사유</TableHead>
                                        <TableHead className="text-gray-400 text-xs sm:text-sm text-center">차트</TableHead>
                                        <TableHead className="text-gray-400 text-xs sm:text-sm text-right">가격</TableHead>
                                        <TableHead className="text-gray-400 text-xs sm:text-sm text-right">수량</TableHead>
                                        <TableHead className="text-gray-400 text-xs sm:text-sm text-right">금액</TableHead>
                                        <TableHead className="text-gray-400 text-xs sm:text-sm text-right">손익</TableHead>
                                        {/* ★ Phase 9: 신뢰도 열 제거 */}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                                                로딩 중...
                                            </TableCell>
                                        </TableRow>
                                    ) : exchange === 'upbit' ? (
                                        logs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                                                    거래 내역이 없습니다
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            logs.map((log) => {
                                                const reasonInfo = getReasonInfo(log.reason, log.side);
                                                return (
                                                    <TableRow key={log.id} className="hover:bg-gray-800/50">
                                                        <TableCell className="text-sm text-gray-300">
                                                            {new Date(log.created_at).toLocaleString('ko-KR')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={log.mode === 'real' ? 'default' : 'secondary'}
                                                                className={log.mode === 'real' ? 'bg-green-600' : 'bg-yellow-600'}>
                                                                {log.mode === 'real' ? '실전' : '모의'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="border-gray-600">
                                                                {getStrategyLabel(log.strategy, log.timeframe)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="font-medium text-white">
                                                            {formatCoinName(log.coin, 'upbit')}
                                                        </TableCell>
                                                        <TableCell>
                                                            {(() => {
                                                                const sideInfo = getSideInfo(log.side);
                                                                return (
                                                                    <span className={`flex items-center gap-1 ${sideInfo.isLong ? 'text-green-400' : 'text-red-400'}`}>
                                                                        {sideInfo.isLong ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                                        {sideInfo.label}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </TableCell>
                                                        <TableCell>
                                                            {reasonInfo.label !== '-' ? (
                                                                <button
                                                                    onClick={() => setSelectedReason({ log, info: reasonInfo, exchange: 'upbit' })}
                                                                    className="flex items-center gap-1 hover:bg-gray-700 px-2 py-1 rounded transition-colors cursor-pointer"
                                                                >
                                                                    <span>{reasonInfo.emoji}</span>
                                                                    <span className="text-sm text-gray-300">{reasonInfo.label}</span>
                                                                    <HelpCircle className="w-3 h-3 text-gray-500" />
                                                                </button>
                                                            ) : (
                                                                <span className="text-gray-500">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <button
                                                                onClick={() => setSelectedChartTrade({ id: log.id, type: 'trade' })}
                                                                className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                                                                title="차트 보기"
                                                            >
                                                                <BarChart2 className="w-4 h-4 text-blue-400" />
                                                            </button>
                                                        </TableCell>
                                                        <TableCell className="text-right">₩{formatKRW(log.price)}</TableCell>
                                                        <TableCell className="text-right">{log.quantity.toFixed(4)}</TableCell>
                                                        <TableCell className="text-right">₩{formatKRW(log.total_amount)}</TableCell>
                                                        <TableCell className="text-right">
                                                            {log.pnl_percent !== null ? (
                                                                <span className={log.pnl_percent >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                                    {formatPercent(log.pnl_percent)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-500">-</span>
                                                            )}
                                                        </TableCell>
                                                        {/* ★ Phase 9: 신뢰도 열 제거 */}
                                                    </TableRow>
                                                )
                                            })
                                        )
                                    ) : (
                                        // Bybit logs
                                        bybitLogs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                                                    거래 내역이 없습니다
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            bybitLogs.map((log) => {
                                                const reasonInfo = getReasonInfo(log.reason, log.side, log.strategy);
                                                return (
                                                    <TableRow key={log.id} className="hover:bg-gray-800/50">
                                                        <TableCell className="text-sm text-gray-300">
                                                            {new Date(log.created_at).toLocaleString('ko-KR')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={log.mode === 'real' ? 'default' : 'secondary'}
                                                                className={log.mode === 'real' ? 'bg-green-600' : 'bg-yellow-600'}>
                                                                {log.mode === 'real' ? '실전' : '모의'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="border-gray-600">
                                                                {getStrategyLabel(log.strategy, log.timeframe)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="font-medium text-white">
                                                            {formatCoinName(log.symbol, 'bybit')}
                                                        </TableCell>
                                                        <TableCell>
                                                            {(() => {
                                                                const sideInfo = getSideInfo(log.side);
                                                                return (
                                                                    <span className={`flex items-center gap-1 ${sideInfo.isLong ? 'text-green-400' : 'text-red-400'}`}>
                                                                        {sideInfo.isLong ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                                        {sideInfo.label}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </TableCell>
                                                        <TableCell>
                                                            {reasonInfo.label !== '-' ? (
                                                                <button
                                                                    onClick={() => setSelectedReason({ log, info: reasonInfo, exchange: 'bybit' })}
                                                                    className="flex items-center gap-1 hover:bg-gray-700 px-2 py-1 rounded transition-colors cursor-pointer"
                                                                >
                                                                    <span>{reasonInfo.emoji}</span>
                                                                    <span className="text-sm text-gray-300">{reasonInfo.label}</span>
                                                                    <HelpCircle className="w-3 h-3 text-gray-500" />
                                                                </button>
                                                            ) : (
                                                                <span className="text-gray-500">-</span>
                                                            )}
                                                        </TableCell>
                                                        {/* Chart button for Bybit */}
                                                        <TableCell className="text-center">
                                                            <button
                                                                onClick={() => setSelectedChartTrade({ id: log.id, type: 'trade' })}
                                                                className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                                                                title="차트 보기"
                                                            >
                                                                <BarChart2 className="w-4 h-4 text-yellow-400" />
                                                            </button>
                                                        </TableCell>
                                                        <TableCell className="text-right">${formatPrice(log.price)}</TableCell>
                                                        <TableCell className="text-right">{log.quantity.toFixed(4)}</TableCell>
                                                        <TableCell className="text-right">${formatUSDT(log.total_amount)}</TableCell>
                                                        <TableCell className="text-right">
                                                            {log.pnl_percent !== null ? (
                                                                <span className={log.pnl_percent >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                                    {formatPercent(log.pnl_percent)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-500">-</span>
                                                            )}
                                                        </TableCell>
                                                        {/* ★ Phase 9: 신뢰도 열 제거 */}
                                                    </TableRow>
                                                )
                                            })
                                        )
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-gray-500">
                                {(filters.offset ?? 0) + 1} - {Math.min((filters.offset ?? 0) + (filters.limit ?? 50), total)} / {total}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-gray-700"
                                    disabled={(filters.offset ?? 0) === 0}
                                    onClick={() => setFilters(prev => ({ ...prev, offset: Math.max(0, (prev.offset ?? 0) - (prev.limit ?? 50)) }))}
                                >
                                    이전
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-gray-700"
                                    disabled={(filters.offset ?? 0) + (filters.limit ?? 50) >= total}
                                    onClick={() => setFilters(prev => ({ ...prev, offset: (prev.offset ?? 0) + (prev.limit ?? 50) }))}
                                >
                                    다음
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>

            {/* Reason Explanation Modal */}
            <Dialog open={selectedReason !== null} onOpenChange={() => setSelectedReason(null)}>
                <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <span className="text-2xl">{selectedReason?.info.emoji}</span>
                            {selectedReason?.info.label}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {selectedReason && (
                            <>
                                {/* 간략 설명 */}
                                <div className="bg-blue-900/30 border border-blue-700/30 rounded-lg p-4">
                                    <p className="text-blue-300 font-medium text-lg">
                                        {selectedReason.info.description}
                                    </p>
                                </div>

                                {/* 상세 설명 */}
                                {selectedReason.info.details && (
                                    <div className="bg-gray-800 rounded-lg p-4">
                                        <p className="text-gray-500 text-sm mb-2">💡 상세 설명</p>
                                        <p className="text-gray-300 leading-relaxed">
                                            {selectedReason.info.details}
                                        </p>
                                    </div>
                                )}

                                {/* 거래 정보 */}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-gray-800 rounded p-3">
                                        <p className="text-gray-500 mb-1">종목</p>
                                        <p className="text-white font-medium">
                                            {selectedReason.exchange === 'upbit'
                                                ? formatCoinName((selectedReason.log as TradeLog).coin, 'upbit')
                                                : formatCoinName((selectedReason.log as BybitTradeLog).symbol, 'bybit')}
                                        </p>
                                    </div>
                                    <div className="bg-gray-800 rounded p-3">
                                        <p className="text-gray-500 mb-1">
                                            {selectedReason.log.side === 'buy' ? '진입 가격' : '가격'}
                                        </p>
                                        <p className="text-white font-medium">
                                            {selectedReason.exchange === 'upbit'
                                                ? `₩${formatKRW(selectedReason.log.price)}`
                                                : `$${formatPrice(selectedReason.log.price)}`}
                                        </p>
                                    </div>

                                    {/* 롱 진입일 때 익절/손절가 표시 */}
                                    {(selectedReason.log.side === 'buy' || selectedReason.log.side === 'long_open') && (
                                        <>
                                            <div className="bg-gray-800 rounded p-3">
                                                <p className="text-gray-500 mb-1">🔴 손절가</p>
                                                <p className="text-red-400 font-medium">
                                                    {(() => {
                                                        const log = selectedReason.log as TradeLog;
                                                        const stopLoss = log.stop_loss || (log.price * 0.95);
                                                        const pct = ((stopLoss - log.price) / log.price * 100);
                                                        return selectedReason.exchange === 'upbit'
                                                            ? <>{`₩${formatKRW(stopLoss)}`}<span className="text-xs text-gray-500 ml-1">({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</span></>
                                                            : <>{`$${formatPrice(stopLoss)}`}<span className="text-xs text-gray-500 ml-1">({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</span></>;
                                                    })()}
                                                </p>
                                            </div>
                                            <div className="bg-gray-800 rounded p-3">
                                                <p className="text-gray-500 mb-1">🟢 {(selectedReason.log as TradeLog).take_profit_2 ? '1차 익절가' : '익절가'}</p>
                                                <p className="text-green-400 font-medium">
                                                    {(() => {
                                                        const log = selectedReason.log as TradeLog;
                                                        const takeProfit = log.take_profit || (log.price * 1.05);
                                                        const pct = ((takeProfit - log.price) / log.price * 100);
                                                        return selectedReason.exchange === 'upbit'
                                                            ? <>{`₩${formatKRW(takeProfit)}`}<span className="text-xs text-gray-500 ml-1">({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</span></>
                                                            : <>{`$${formatPrice(takeProfit)}`}<span className="text-xs text-gray-500 ml-1">({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</span></>;
                                                    })()}
                                                </p>
                                            </div>
                                            {/* ★ Phase 9: 2차 익절가 추가 */}
                                            {(selectedReason.log as TradeLog).take_profit_2 && (
                                                <div className="bg-gray-800 rounded p-3">
                                                    <p className="text-gray-500 mb-1">🟢 2차 익절가</p>
                                                    <p className="text-green-300 font-medium">
                                                        {(() => {
                                                            const log = selectedReason.log as TradeLog;
                                                            const takeProfit2 = log.take_profit_2!;
                                                            const pct = ((takeProfit2 - log.price) / log.price * 100);
                                                            return selectedReason.exchange === 'upbit'
                                                                ? <>{`₩${formatKRW(takeProfit2)}`}<span className="text-xs text-gray-500 ml-1">({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</span></>
                                                                : <>{`$${formatPrice(takeProfit2)}`}<span className="text-xs text-gray-500 ml-1">({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</span></>;
                                                        })()}
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* 숏 진입일 때 익절/손절가 표시 (방향 반대) */}
                                    {selectedReason.log.side === 'short_open' && (
                                        <>
                                            <div className="bg-gray-800 rounded p-3">
                                                <p className="text-gray-500 mb-1">🔴 손절가 (가격 상승 시)</p>
                                                <p className="text-red-400 font-medium">
                                                    {(() => {
                                                        const log = selectedReason.log as any;
                                                        const stopLoss = log.stop_loss || (log.price * 1.05);
                                                        const pct = ((stopLoss - log.price) / log.price * 100);
                                                        return <>{`$${formatPrice(stopLoss)}`}<span className="text-xs text-gray-500 ml-1">({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</span></>;
                                                    })()}
                                                </p>
                                            </div>
                                            <div className="bg-gray-800 rounded p-3">
                                                <p className="text-gray-500 mb-1">🟢 {(selectedReason.log as any).take_profit_2 ? '1차 익절가 (가격 하락 시)' : '익절가 (가격 하락 시)'}</p>
                                                <p className="text-green-400 font-medium">
                                                    {(() => {
                                                        const log = selectedReason.log as any;
                                                        const takeProfit = log.take_profit || (log.price * 0.95);
                                                        const pct = ((takeProfit - log.price) / log.price * 100);
                                                        return <>{`$${formatPrice(takeProfit)}`}<span className="text-xs text-gray-500 ml-1">({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</span></>;
                                                    })()}
                                                </p>
                                            </div>
                                            {/* ★ Phase 9: 숏 2차 익절가 추가 */}
                                            {(selectedReason.log as any).take_profit_2 && (
                                                <div className="bg-gray-800 rounded p-3">
                                                    <p className="text-gray-500 mb-1">🟢 2차 익절가</p>
                                                    <p className="text-green-300 font-medium">
                                                        {(() => {
                                                            const log = selectedReason.log as any;
                                                            const takeProfit2 = log.take_profit_2;
                                                            const pct = ((takeProfit2 - log.price) / log.price * 100);
                                                            return <>{`$${formatPrice(takeProfit2)}`}<span className="text-xs text-gray-500 ml-1">({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</span></>;
                                                        })()}
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* 매도일 때만 수익률 표시 */}
                                    {selectedReason.log.side === 'sell' && (
                                        <div className="bg-gray-800 rounded p-3">
                                            <p className="text-gray-500 mb-1">수익률</p>
                                            <p className={`font-medium ${(selectedReason.log.pnl_percent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                {formatPercent(selectedReason.log.pnl_percent)}
                                            </p>
                                        </div>
                                    )}

                                    <div className="bg-gray-800 rounded p-3">
                                        <p className="text-gray-500 mb-1">시간</p>
                                        <p className="text-white font-medium text-xs">
                                            {new Date(selectedReason.log.created_at).toLocaleString('ko-KR')}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Trade Chart Modal */}
            <TradeChartModal
                isOpen={selectedChartTrade !== null}
                onClose={() => setSelectedChartTrade(null)}
                tradeId={selectedChartTrade?.id}
                type={selectedChartTrade?.type || 'trade'}
            />
        </div>
    );
}
