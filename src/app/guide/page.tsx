'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
// Using regular img tag instead of next/image for static files

type StrategyTab = 'divergence' | 'harmonic' | 'leading_diagonal' | 'morning_star' | 'inverted_hammer' | 'squirrel' | 'bearish_divergence' | 'evening_star' | 'shooting_star' | 'bearish_engulfing' | 'leading_diagonal_breakdown';

interface StrategyGuide {
    id: StrategyTab;
    name: string;
    emoji: string;
    description: string;
    timeframes: string[];
    entryConditions: string[];
    // ★ Phase 9: ATR 기반 SL/TP, 100% 청산 (invalidation 제거)
    stopLoss: string;  // ATR 기반 단일 손절
    takeProfit: string;  // ATR 기반 단일 익절 (100% 청산)
    chartImage: string;
    tips: string[];
}

// ★ Phase 9: 실제 구현 기준 전략 데이터 (100% 청산, ATR 버퍼)
// SL 버퍼: 롱 -ATR×1.0, 숏 +ATR×1.0
// TP 버퍼: 롱 -ATR×0.2, 숏 +ATR×0.2
const strategies: StrategyGuide[] = [
    {
        id: 'divergence',
        name: '상승 다이버전스',
        emoji: '📊',
        description: '가격은 Lower Low(저점 갱신), RSI는 Higher Low(저점 상승)하는 현상. 과매도 구간에서 반전 신호로 매수.',
        timeframes: ['1D (일봉)', '4H (4시간봉)'],
        entryConditions: [
            '가격 Lower Low: 현재 저점 < 이전 저점',
            'RSI Higher Low: 현재 RSI > 이전 RSI',
            '과매도: 이전 RSI ≤ 30',
            '트리거: RSI 반등 or 양봉 마감'
        ],
        stopLoss: 'Swing Low - ATR×1.0',
        takeProfit: '진입가 + 손절폭×2 - ATR×0.2 (1:2 RR)',
        chartImage: '/images/guide/divergence.png',
        tips: [
            'RSI가 30 이하에서 발생하는 다이버전스가 더 강력합니다',
            '거래량이 동반되면 신뢰도가 높아집니다',
            '일봉 다이버전스가 4시간봉보다 신뢰도가 높습니다'
        ]
    },
    {
        id: 'harmonic',
        name: '하모닉 패턴',
        emoji: '🦋',
        description: 'XABCD 피보나치 비율 패턴. D점(PRZ)에서 양봉 반전 시 진입.',
        timeframes: ['1D (일봉)', '4H (4시간봉)'],
        entryConditions: [
            'XABCD 패턴 완성 (Gartley/Bat)',
            '피보나치 정확도 ≥ 80%',
            'D점에서 양봉 반전 확인'
        ],
        stopLoss: 'X점 or XA 1.13 확장 - ATR×1.0',
        takeProfit: 'D + AD×0.382 - ATR×0.2 (1차 TP)',
        chartImage: '/images/guide/harmonic.png',
        tips: [
            '피보나치 비율 정확도가 높을수록 신뢰도가 높습니다',
            'D점에서 양봉 반등이 필수입니다',
            '2차 TP: D + AD×0.618'
        ]
    },
    {
        id: 'leading_diagonal',
        name: '리딩 다이아고날',
        emoji: '💎',
        description: '폴링 웻지(Falling Wedge) 상단 돌파 시 매수.',
        timeframes: ['1D (일봉)', '4H (4시간봉)'],
        entryConditions: [
            '고점/저점 수렴 형태 (폴링 웻지)',
            '상단 저항선 양봉 돌파',
            '돌파 캔들이 양봉으로 마감'
        ],
        stopLoss: '하단 지지선 - ATR×1.0',
        takeProfit: '진입가 + 웻지 입구 크기 - ATR×0.2',
        chartImage: '/images/guide/leading_diagonal.png',
        tips: [
            '쐐기 폭이 좁을수록 돌파 시 상승폭이 큽니다',
            '거래량 증가 동반 시 더 강력합니다',
            '양봉 마감 확인 필수'
        ]
    },
    {
        id: 'morning_star',
        name: '샛별형',
        emoji: '⭐',
        description: '3캔들 반전 패턴: 긴 음봉(N-2) → 도지(N-1) → 긴 양봉(N). 50% 이상 회복 시 진입.',
        timeframes: ['1D (일봉)', '4H (4시간봉)'],
        entryConditions: [
            'N-2: 긴 음봉 (몸통 ≥ 1%)',
            'N-1: 도지/팽이 (몸통 ≤ 1%)',
            'N: 양봉 + N-2의 50% 이상 회복'
        ],
        stopLoss: 'N-1 Low - ATR×1.0',
        takeProfit: '진입가 + 손절폭×2 - ATR×0.2 (1:2 RR)',
        chartImage: '/images/guide/morning_star.png',
        tips: [
            'N-2 음봉이 클수록 반전 신호가 강합니다',
            'N-1이 도지에 가까울수록 좋습니다',
            'N 양봉 거래량이 많을수록 신뢰도 상승'
        ]
    },
    {
        id: 'inverted_hammer',
        name: '역망치형',
        emoji: '🔨',
        description: '하락 추세에서 긴 윗꼬리 캔들 출현 후 확인 캔들로 진입.',
        timeframes: ['1D (일봉)', '4H (4시간봉)'],
        entryConditions: [
            '하락 추세: Close < MA20',
            '윗꼬리 ≥ 몸통×2',
            '아래꼬리 ≤ 몸통×0.5',
            '확인: 다음 캔들 양봉 or 고점 돌파'
        ],
        stopLoss: '역망치 Low - ATR×1.0',
        takeProfit: '진입가 + 윗꼬리 길이 - ATR×0.2 (1:1 RR)',
        chartImage: '/images/guide/inverted_hammer.png',
        tips: [
            '윗꼬리가 길수록 매수 시도가 강했다는 의미',
            '지지선 근처에서 발생하면 더 유효',
            '확인 캔들 필수'
        ]
    },
    {
        id: 'squirrel',
        name: '다람쥐 꼬리',
        emoji: '🐿️',
        description: '지지선 근처에서 긴 아래꼬리 캔들(Pin Bar) 출현 시 매수.',
        timeframes: ['1D (일봉)'],
        entryConditions: [
            '주요 지지선 근처 발생',
            '아래꼬리 ≥ 몸통×2',
            '윗꼬리 < 아래꼬리',
            '확인: 다음 캔들이 패턴 종가 위로 마감'
        ],
        stopLoss: '꼬리 최저점 - ATR×1.0 (긴 경우 꼬리 50%)',
        takeProfit: 'Range High (최근 10캔들 고점) - ATR×0.2',
        chartImage: '/images/guide/squirrel.png',
        tips: [
            '아래꼬리가 길수록 매수세가 강했다는 의미',
            '지지선에서 발생 시 더 신뢰도 높음',
            '확인 캔들 필수'
        ]
    },
    // ===== 숏 전략 =====
    {
        id: 'bearish_divergence',
        name: '하락 다이버전스',
        emoji: '📉',
        description: '가격은 Higher High, RSI는 Lower High. 과매수 구간에서 하락 반전 신호로 숏.',
        timeframes: ['1D (일봉)', '4H (4시간봉)'],
        entryConditions: [
            '가격 Higher High: 현재 고점 > 이전 고점',
            'RSI Lower High: 현재 RSI < 이전 RSI',
            '과매수: 이전 RSI ≥ 70',
            '트리거: RSI 하락 or 음봉 마감'
        ],
        stopLoss: 'Current High + ATR×1.0',
        takeProfit: 'Fib 0.5 되돌림 + ATR×0.2',
        chartImage: '/images/guide/bearish_divergence.png',
        tips: [
            'RSI가 70 이상에서 발생하는 다이버전스가 더 강력합니다',
            '저항선 근처에서 발생하면 신뢰도가 높아집니다',
            '일봉 다이버전스가 4시간봉보다 신뢰도가 높습니다'
        ]
    },
    {
        id: 'evening_star',
        name: '석양형',
        emoji: '🌆',
        description: '3캔들 반전 패턴: 긴 양봉(N-2) → 도지(N-1) → 긴 음봉(N). 50% 이상 하락 시 진입.',
        timeframes: ['1D (일봉)'],
        entryConditions: [
            'N-2: 긴 양봉 (몸통 ≥ 1%)',
            'N-1: 도지/팽이 (몸통 ≤ 1%)',
            'N: 음봉 + N-2의 50% 이상 하락'
        ],
        stopLoss: 'N-1 High + ATR×1.0',
        takeProfit: '진입가 - 손절폭×2 + ATR×0.2 (1:2 RR)',
        chartImage: '/images/guide/evening_star.png',
        tips: [
            'N-2 양봉이 클수록 반전 신호가 강합니다',
            'N-1이 도지에 가까울수록 좋습니다',
            'N 음봉 거래량이 많을수록 신뢰도 상승'
        ]
    },
    {
        id: 'shooting_star',
        name: '유성형',
        emoji: '☄️',
        description: '상승 추세에서 긴 윗꼬리 캔들 출현 후 확인 캔들로 숏 진입.',
        timeframes: ['1D (일봉)'],
        entryConditions: [
            '상승 추세: Close > MA20',
            '윗꼬리 ≥ 몸통×2',
            '아래꼬리 ≤ 몸통×0.5',
            '확인: 다음 캔들 음봉 or 저점 이탈'
        ],
        stopLoss: '유성형 High + ATR×1.0',
        takeProfit: '진입가 - 캔들길이 + ATR×0.2',
        chartImage: '/images/guide/shooting_star.png',
        tips: [
            '윗꼬리가 길수록 매도 압력이 강했다는 의미',
            '저항선 근처에서 발생하면 더 유효',
            '확인 캔들 필수'
        ]
    },
    {
        id: 'bearish_engulfing',
        name: '하락장악형',
        emoji: '🔻',
        description: '양봉(N-1)을 음봉(N)이 완전히 장악. 거래량 증가 시 강한 하락 신호.',
        timeframes: ['1D (일봉)'],
        entryConditions: [
            'N-1: 양봉',
            'N: 음봉',
            '장악: N.Open ≥ N-1.Close, N.Close < N-1.Open',
            '추세: SMA20↑ or RSI ≥ 60',
            '거래량: N > N-1'
        ],
        stopLoss: 'N High + ATR×1.0',
        takeProfit: 'Fib 0.618 되돌림 + ATR×0.2',
        chartImage: '/images/guide/bearish_engulfing.png',
        tips: [
            '장악 비율이 클수록 강한 하락 신호',
            '거래량이 함께 증가하면 더 신뢰할 수 있습니다',
            '상승 추세 끝에서 나오면 더 강력한 신호'
        ]
    },
    {
        id: 'leading_diagonal_breakdown',
        name: '리딩다이아 하단이탈',
        emoji: '📐',
        description: '상승 쐐기(Rising Wedge) 하단 지지선 이탈 시 숏 진입.',
        timeframes: ['1D (일봉)', '4H (4시간봉)'],
        entryConditions: [
            '상승 쐐기: 고점↑ 저점↑ 수렴',
            '트리거: Close < 지지 추세선',
            '거래량: 이탈 캔들 > 평균'
        ],
        stopLoss: 'Recent High + ATR×1.0',
        takeProfit: 'Start + (Range×0.5) + ATR×0.2 (Fib 0.5)',
        chartImage: '/images/guide/leading_diagonal_breakdown.png',
        tips: [
            '상승 쐐기 이탈 = 상승 에너지 소진',
            '거래량 동반 이탈은 강력한 신호',
            '쐐기 폭이 좁을수록 이탈 시 하락폭이 큽니다'
        ]
    }
];

export default function GuidePage() {
    const [activeTab, setActiveTab] = useState<StrategyTab>('divergence');

    const currentStrategy = strategies.find(s => s.id === activeTab)!;

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <h1 className="font-bold text-lg">📚 전략 가이드</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-6">
                {/* Strategy Tabs */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {strategies.map((strategy) => (
                        <button
                            key={strategy.id}
                            onClick={() => setActiveTab(strategy.id)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${activeTab === strategy.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            {strategy.emoji} {strategy.name}
                        </button>
                    ))}
                </div>

                {/* Strategy Content */}
                <div className="space-y-6">
                    {/* Strategy Header */}
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-2xl">
                                <span className="text-4xl">{currentStrategy.emoji}</span>
                                <div>
                                    <span>{currentStrategy.name}</span>
                                    <div className="flex gap-2 mt-2">
                                        {currentStrategy.timeframes.map((tf) => (
                                            <Badge key={tf} variant="outline" className="text-xs border-blue-500/50 text-blue-400">
                                                {tf}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-300 leading-relaxed">{currentStrategy.description}</p>
                        </CardContent>
                    </Card>

                    {/* Chart Image */}
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-lg">📈 패턴 차트</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative w-full bg-gray-950 rounded-lg overflow-hidden flex items-center justify-center">
                                <img
                                    src={currentStrategy.chartImage}
                                    alt={`${currentStrategy.name} 차트`}
                                    className="max-w-full h-auto max-h-[500px] object-contain"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWYyOTM3Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuywqO2KuCDsnbTrr7jsp4Ag66Gc65SpIOykkTwvdGV4dD48L3N2Zz4=';
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Entry Conditions */}
                        <Card className="bg-gray-900 border-gray-800 border-l-4 border-l-green-500">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg text-green-400">
                                    <TrendingUp className="w-5 h-5" />
                                    진입 조건
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {currentStrategy.entryConditions.map((condition, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-gray-300">
                                            <span className="text-green-500 font-bold">{idx + 1}.</span>
                                            <span>{condition}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        {/* Stop Loss */}
                        <Card className="bg-gray-900 border-gray-800 border-l-4 border-l-red-500">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg text-red-400">
                                    <AlertTriangle className="w-5 h-5" />
                                    손절 기준 (Stop Loss)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* ★ Phase 9: 단일 SL 표시 */}
                                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                                    <span className="text-red-400">🔴 </span>
                                    <span className="text-gray-300">{currentStrategy.stopLoss}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Invalidation Condition */}
                    {/* ★ Phase 9: 무효화 조건 섹션 제거 (SL/TP만 사용) */}

                    {/* Take Profit - 100% 청산 */}
                    <Card className="bg-gray-900 border-gray-800 border-l-4 border-l-green-500">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg text-green-400">
                                <Target className="w-5 h-5" />
                                익절 기준 (Take Profit)
                                <Badge className="bg-green-600">100% 청산</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* ★ Phase 9: 단일 TP 표시 */}
                            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                                <span className="text-green-400">🟢 </span>
                                <span className="text-gray-300">{currentStrategy.takeProfit}</span>
                            </div>
                            <p className="text-gray-500 text-sm mt-3">
                                ★ 2024년 1월 리팩토링: 분할매도 제거, 100% 청산으로 단순화
                            </p>
                        </CardContent>
                    </Card>

                    {/* Tips */}
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-lg">💡 활용 팁</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3">
                                {currentStrategy.tips.map((tip, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-gray-300">
                                        <span className="text-blue-400">•</span>
                                        <span>{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
