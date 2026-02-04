'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, Coins, ArrowRight, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ExchangeType = 'upbit' | 'bybit';

export default function SelectExchangePage() {
    const { user, logout, isLoading } = useAuth();
    const router = useRouter();
    const [selectedExchange, setSelectedExchange] = useState<ExchangeType | null>(null);

    // Get last selected exchange from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const lastExchange = localStorage.getItem('selectedExchange') as ExchangeType;
            if (lastExchange) {
                setSelectedExchange(lastExchange);
            }
        }
    }, []);

    const handleSelectExchange = (exchange: ExchangeType) => {
        setSelectedExchange(exchange);
        localStorage.setItem('selectedExchange', exchange);

        if (exchange === 'upbit') {
            router.push('/');  // Upbit dashboard is the main page
        } else {
            router.push('/bybit');  // Bybit dashboard
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-gray-400 animate-pulse">로딩 중...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg">MAXI AI Trading</h1>
                            <p className="text-xs text-gray-500">거래소 선택</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {user && (
                            <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
                                <User className="w-4 h-4" />
                                <span>{user.email}</span>
                            </div>
                        )}
                        <Button variant="ghost" size="icon" onClick={logout} title="로그아웃">
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-12">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-4">거래소를 선택하세요</h2>
                    <p className="text-gray-400">각 거래소별로 독립적인 전략과 포트폴리오가 관리됩니다</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Upbit Card */}
                    <Card
                        className={`bg-gray-900 border-2 transition-all cursor-pointer hover:scale-105 ${selectedExchange === 'upbit'
                                ? 'border-orange-500 shadow-lg shadow-orange-500/20'
                                : 'border-gray-700 hover:border-gray-600'
                            }`}
                        onClick={() => handleSelectExchange('upbit')}
                    >
                        <div className="p-6">
                            {/* Exchange Logo/Icon */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
                                        <span className="text-2xl font-bold">U</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Upbit</h3>
                                        <p className="text-sm text-gray-400">업비트</p>
                                    </div>
                                </div>
                                <Badge className="bg-orange-600/20 text-orange-400 border-orange-500/50">현물</Badge>
                            </div>

                            {/* Features */}
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                    <Coins className="w-4 h-4 text-orange-400" />
                                    <span>KRW 원화 거래</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                    <TrendingUp className="w-4 h-4 text-orange-400" />
                                    <span>거래대금 상위 20개 코인</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                    <Activity className="w-4 h-4 text-orange-400" />
                                    <span>현물 매수/매도</span>
                                </div>
                            </div>

                            {/* Action */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                                <div>
                                    <p className="text-xs text-gray-500">모의투자 시작금액</p>
                                    <p className="font-semibold">₩10,000,000</p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-orange-400" />
                            </div>
                        </div>
                    </Card>

                    {/* Bybit Card */}
                    <Card
                        className={`bg-gray-900 border-2 transition-all cursor-pointer hover:scale-105 ${selectedExchange === 'bybit'
                                ? 'border-yellow-500 shadow-lg shadow-yellow-500/20'
                                : 'border-gray-700 hover:border-gray-600'
                            }`}
                        onClick={() => handleSelectExchange('bybit')}
                    >
                        <div className="p-6">
                            {/* Exchange Logo/Icon */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                                        <span className="text-2xl font-bold">B</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Bybit</h3>
                                        <p className="text-sm text-gray-400">바이빗</p>
                                    </div>
                                </div>
                                <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-500/50">선물</Badge>
                            </div>

                            {/* Features */}
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                    <Coins className="w-4 h-4 text-yellow-400" />
                                    <span>USDT 테더 거래</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                    <TrendingUp className="w-4 h-4 text-yellow-400" />
                                    <span>시가총액 상위 10개 코인</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                    <Activity className="w-4 h-4 text-yellow-400" />
                                    <span>5배 레버리지 롱 포지션</span>
                                </div>
                            </div>

                            {/* Action */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                                <div>
                                    <p className="text-xs text-gray-500">모의투자 시작금액</p>
                                    <p className="font-semibold">$10,000 USDT</p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-yellow-400" />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Info */}
                <div className="mt-12 text-center">
                    <p className="text-sm text-gray-500">
                        언제든지 헤더의 드롭다운 메뉴에서 거래소를 변경할 수 있습니다
                    </p>
                </div>
            </main>
        </div>
    );
}
