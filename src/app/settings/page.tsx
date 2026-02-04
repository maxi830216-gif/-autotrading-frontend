'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    getSettings,
    updateSettings,
    testTelegram,
    validateUpbit,
    changePassword,
    getBybitSettings,
    updateBybitApiKeys,
    Settings,
    BybitSettings
} from '@/lib/api';
import { ArrowLeft, Check, X, Loader2, Key, MessageCircle, Shield, Lock, TrendingUp, Settings as SettingsIcon, HelpCircle, ArrowUpCircle, ArrowDownCircle, Target, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

// Strategy Guide Data
const strategyGuides: Record<string, {
    title: string;
    description: string;
    simpleExplanation: string;  // 일반인용 쉬운 설명
    analogy: string;            // 비유로 이해하기
    timeframes: string[];       // 다중 타임프레임
    entryConditions: { label: string; simple: string; formula?: string }[];
    exitConditions: { type: string; label: string; simple: string; formula?: string }[];
    confidenceFactors: { label: string; weight: string }[];
    tips: string[];
}> = {
    squirrel: {
        title: '상승 다람쥐 (Rising Squirrel)',
        description: '강한 상승 추세 중 건강한 조정 구간을 타겟하는 전략',
        simpleExplanation: '🐿️ 코인이 크게 오른 후 잠시 쉬어갈 때 다시 오를 것을 예상하고 사는 전략이에요. 다람쥐가 나무 위로 계속 오르다가 잠시 쉬는 것처럼요!',
        analogy: '📈 엘리베이터를 타고 올라가다가 잠시 멈춘 층에서 다시 타는 것과 비슷해요.',
        timeframes: ['일봉 (1D)'],
        entryConditions: [
            { label: '큰 양봉 발견', simple: '최근 10일 내 가격이 크게 오른 날(5% 이상)이 있어야 해요', formula: '(Close - Open) / Open ≥ 5%' },
            { label: '거래량 폭발', simple: '그 날 거래량이 평소보다 2배 이상 많았어야 해요', formula: 'Volume ≥ 20일 평균 × 2' },
            { label: '가격 유지', simple: '현재 가격이 그 큰 양봉의 중간 가격보다 높아야 해요', formula: 'Current Price > 참조캔들 중간값' },
            { label: '조용한 조정', simple: '지금 거래량은 오히려 줄어든 상태여야 해요 (관심이 줄었지만 팔지는 않는 상태)', formula: 'Current Volume < 참조캔들 Volume × 40%' },
        ],
        exitConditions: [
            { type: '1차 익절', label: '50% 부분 익절', simple: '+5% 수익 도달 또는 장대양봉 고점 터치 시 절반(50%)을 익절해요', formula: 'Price ≥ 참조캔들 High OR Profit ≥ 5%' },
            { type: '2차 익절', label: '나머지 전량 청산', simple: '1차 익절 후, MA5 이탈 시 나머지를 전량 청산해요', formula: 'Close < MA5' },
            { type: '이익보존', label: '진입가 회귀 시 청산', simple: '1차 익절 후 가격이 다시 진입가로 내려오면 바로 청산해요 (수익 보존)', formula: 'Price ≤ Entry Price' },
            { type: '손절', label: '지지선 붕괴', simple: '가격이 큰 양봉의 시작 가격보다 내려가면 손절해요', formula: 'Close < 참조캔들 Open' },
        ],
        confidenceFactors: [
            { label: '가격 위치 (중간값에 가까울수록 Good)', weight: '최대 50%' },
            { label: '거래량 수축률 (적을수록 Good)', weight: '최대 50%' },
        ],
        tips: [
            '💡 큰 양봉은 "기관이나 큰 손이 매수했다"는 신호예요',
            '💡 조용한 조정은 "팔 사람은 다 팔았다"는 뜻이에요',
            '💡 1차 익절(50%)로 수익 확정 후, 나머지는 추세 따라가요',
            '💡 1차 익절 후 진입가 회귀 시 즉시 청산하여 이익을 보존해요',
        ],
    },
    morning: {
        title: '샛별형 (Morning Star)',
        description: '일봉/4시간봉 기준 과매도 구간 반등 매수',
        simpleExplanation: '⭐ 가격이 계속 떨어지다가 바닥을 찍고 반등할 때 사는 전략이에요. 새벽에 뜨는 샛별처럼 어두운 밤(하락) 후에 밝은 아침(상승)이 온다는 의미예요!',
        analogy: '🎢 롤러코스터가 내려가다가 바닥을 찍고 다시 올라가기 시작할 때 타는 것과 비슷해요.',
        timeframes: ['4시간봉 (4H)', '일봉 (1D)'],
        entryConditions: [
            { label: '1번 캔들: 큰 하락', simple: '가격이 크게 떨어진 날이 있어요 (빨간색 큰 봉)', formula: 'Close < Open, Body ≥ 2%' },
            { label: '2번 캔들: 망설임', simple: '다음 날 가격이 거의 안 움직였어요 (작은 십자 모양)', formula: 'Body ≤ 0.5%' },
            { label: '3번 캔들: 반등 시작', simple: '그 다음 날 가격이 크게 올랐어요 (초록색 큰 봉)', formula: 'Close > Open, Body ≥ 2%' },
            { label: 'RSI 과매도', simple: 'RSI 지표가 35 미만 = "너무 많이 팔렸다" 신호', formula: 'RSI(14) < 35' },
        ],
        exitConditions: [
            { type: '익절', label: 'RSI 과매수', simple: 'RSI가 70 이상 = "너무 많이 샀다" 신호일 때 팔아요', formula: 'RSI(14) > 70' },
            { type: '익절', label: '볼린저 상단', simple: '가격이 통계적으로 "비싼 구간"에 도달하면 팔아요', formula: 'Price ≥ BB Upper' },
            { type: '손절', label: '패턴 실패', simple: '가격이 다시 패턴의 최저점보다 내려가면 손절해요', formula: 'Close < 패턴 3봉 최저가' },
        ],
        confidenceFactors: [
            { label: 'RSI 레벨 (낮을수록 Good)', weight: '최대 50%' },
            { label: '볼린저 위치 (하단 근처면 Good)', weight: '최대 30%' },
        ],
        tips: [
            '💡 "큰 하락 → 멈춤 → 반등" 3단계 패턴이 핵심이에요',
            '💡 RSI가 낮을수록 "바닥"일 확률이 높아요',
            '💡 4H는 빠른 반등 포착, 1D는 큰 반등 포착에 좋아요',
        ],
    },
    inverted_hammer: {
        title: '윗꼬리양봉 (Inverted Hammer)',
        description: '일봉/4시간봉 기준 하락 브레이크 후 반등 매수 (거래량 스파이크 필수)',
        simpleExplanation: '🔨 가격이 바닥을 뚫고 내려갔다가 다시 올라와서 마감하는 패턴이에요. 이건 "개미들 손절시키고 기관이 매집"하는 전형적인 신호예요!',
        analogy: '🎣 낚시로 비유하면, 미끼(가짜 하락)로 겁먹은 사람들을 털어내고 진짜 상승이 시작되는 거예요.',
        timeframes: ['4시간봉 (4H)', '일봉 (1D)'],
        entryConditions: [
            { label: '하락 추세', simple: '현재 가격이 20일 평균보다 낮아요 (하락장)', formula: 'Close < MA(20)' },
            { label: 'RSI 과매도', simple: 'RSI가 40 미만 = 많이 팔린 상태', formula: 'RSI(14) < 40' },
            { label: '양봉', simple: '시작가보다 종가가 높아요 (초록색)', formula: 'Close > Open' },
            { label: '긴 윗꼬리', simple: '위로 길게 올라갔다가 내려왔어요 (매수세 테스트)', formula: '(High - Close) > Body × 2' },
            { label: '짧은 아래꼬리', simple: '아래로는 별로 안 내려갔어요', formula: '(Open - Low) < Body × 50%' },
            { label: '허위돌파', simple: '❗ 핵심! 최저점을 잠깐 뚫고 내려갔다가 다시 올라왔어요', formula: 'Low < 10일 최저점' },
            { label: '거래량 급등', simple: '거래량이 평소보다 1.5배 이상 많아요', formula: 'Volume ≥ 20일 평균 × 1.5' },
            { label: '확인 캔들', simple: '다음 날도 계속 오르면 진입해요', formula: '다음봉 Close > 패턴봉 Close' },
        ],
        exitConditions: [
            { type: '익절', label: '패턴 고점 도달', simple: '그 날의 최고점에 도달하면 1차 익절', formula: 'Price ≥ 패턴봉 High' },
            { type: '익절', label: '20일선 도달', simple: '20일 평균선까지 오르면 2차 익절', formula: 'Price ≥ MA(20)' },
            { type: '손절', label: '패턴 실패', simple: '그 날의 최저점보다 더 내려가면 손절', formula: 'Close < 패턴봉 Low' },
        ],
        confidenceFactors: [
            { label: '허위돌파 깊이 (깊을수록 Good)', weight: '최대 25%' },
            { label: 'RSI 레벨 (낮을수록 Good)', weight: '최대 25%' },
            { label: '윗꼬리 길이 (길수록 Good)', weight: '최대 15%' },
            { label: '거래량 급등률 (많을수록 Good)', weight: '최대 15%' },
        ],
        tips: [
            '💡 허위돌파 = 기관이 개미 손절물량을 싼 값에 매집하는 것',
            '💡 긴 윗꼬리 = 매수세가 매도세를 이긴 증거',
            '💡 거래량 급등 = 큰 손이 참여했다는 신호',
            '💡 확인 캔들로 "가짜 신호"를 걸러내요',
        ],
    },
    divergence: {
        title: '상승 다이버전스 (Bullish Divergence)',
        description: '가격-지표 괴리를 통한 바닥 반전 감지',
        simpleExplanation: '📊 가격은 계속 떨어지는데 RSI는 오히려 올라가요! 이건 "힘이 빠졌다"는 신호로, 곧 반등할 거란 뜻이에요.',
        analogy: '🏀 공을 바닥에 세게 던지면 더 높이 튀어오르는 것처럼, 가격이 바닥을 찍으면 반등이 와요.',
        timeframes: ['4시간봉 (4H)', '일봉 (1D)'],
        entryConditions: [
            { label: '가격 저점 하락', simple: '현재 가격 저점이 이전 저점보다 더 낮아요', formula: 'Low₂ < Low₁' },
            { label: 'RSI 저점 상승', simple: '하지만 RSI는 이전보다 오히려 높아졌어요', formula: 'RSI₂ > RSI₁ (다이버전스!)' },
            { label: 'RSI 과매도', simple: 'RSI가 40 미만의 과매도 구간이에요', formula: 'RSI(14) < 40' },
        ],
        exitConditions: [
            { type: '1차 익절', label: '50% 부분 익절', simple: '+5% 또는 RSI > 50 도달 시 절반 매도', formula: 'Profit ≥ 5% OR RSI > 50' },
            { type: '2차 익절', label: '전량 청산', simple: '+10% 또는 RSI > 70 도달 시 나머지 매도', formula: 'Profit ≥ 10% OR RSI > 70' },
            { type: '손절', label: '저점 이탈', simple: '다이버전스 시작점 저점 아래로 이탈', formula: 'Close < 다이버전스 저점' },
        ],
        confidenceFactors: [
            { label: 'RSI 저점 상승폭', weight: '최대 30%' },
            { label: 'MACD 동시 다이버전스', weight: '최대 25%' },
            { label: '거래량 증가', weight: '최대 20%' },
            { label: '지지선 근접', weight: '최대 25%' },
        ],
        tips: [
            '💡 다이버전스 = 하락세가 힘을 잃었다는 강력한 신호',
            '💡 RSI+MACD 동시 다이버전스는 매우 신뢰도 높음',
            '💡 과매도 구간에서 더 강력한 신호',
        ],
    },
    harmonic: {
        title: '하모닉 패턴 (Harmonic Pattern)',
        description: '피보나치 비율 기반 정밀 반전 지점 감지 (가틀리/배트)',
        simpleExplanation: '🎯 수학적으로 계산된 정확한 반전 지점을 찾아요. 마치 음악의 화음처럼 가격도 특정 비율에서 조화를 이뤄요.',
        analogy: '🎹 피아노 건반 사이의 간격처럼, 가격 움직임도 특정 비율을 따르는 경향이 있어요.',
        timeframes: ['4시간봉 (4H)', '일봉 (1D)'],
        entryConditions: [
            { label: 'D점 도달', simple: 'XABCD 패턴에서 D점(반전 지점)에 도달했어요', formula: 'XD = XA의 78.6%(가틀리) 또는 88.6%(배트)' },
            { label: '피보나치 정확도', simple: '각 포인트가 피보나치 비율에 정확히 맞아요', formula: '오차 ≤ 3%' },
            { label: 'RSI 과매도', simple: 'D점에서 RSI가 과매도 구간이에요', formula: 'RSI(14) < 40' },
        ],
        exitConditions: [
            { type: '1차 익절', label: '50% 부분 익절', simple: '+5% 또는 A점(TP1) 도달 시', formula: 'Profit ≥ 5% OR Price ≥ A점' },
            { type: '2차 익절', label: '전량 청산', simple: '+10% 또는 C점(TP2) 도달 시', formula: 'Profit ≥ 10% OR Price ≥ C점' },
            { type: '손절', label: 'X점 이탈', simple: 'D점 아래 X점 방향 3% 이탈', formula: 'Close < D점 × 97%' },
        ],
        confidenceFactors: [
            { label: '피보나치 정확도', weight: '최대 40%' },
            { label: 'RSI 과매도', weight: '최대 25%' },
            { label: '거래량 프로파일', weight: '최대 20%' },
            { label: '반전 캔들 패턴', weight: '최대 15%' },
        ],
        tips: [
            '💡 가틀리: XA의 78.6% 되돌림 (더 보수적)',
            '💡 배트: XA의 88.6% 되돌림 (더 깊은 조정)',
            '💡 피보나치 비율이 정확할수록 신뢰도 높음',
        ],
    },
    leading_diagonal: {
        title: '리딩 다이아고날 (Leading Diagonal)',
        description: '하락 쐐기 패턴 상단 돌파 시 상승 추세 시작 감지',
        simpleExplanation: '📐 가격이 삼각형 모양으로 수렴하다가 위쪽으로 터져 나오는 패턴이에요! 새로운 상승 추세의 시작 신호예요.',
        analogy: '🚀 발사대에서 카운트다운 후 로켓이 발사되는 것처럼, 에너지를 모았다가 폭발해요.',
        timeframes: ['4시간봉 (4H)', '일봉 (1D)'],
        entryConditions: [
            { label: '하락 쐐기 패턴', simple: '고점과 저점이 모두 수렴하는 쐐기 형태', formula: '저점선, 고점선 모두 하락 + 수렴' },
            { label: '상단 돌파', simple: '저항선(고점 연결선)을 위로 돌파했어요', formula: 'Close > 저항선' },
            { label: 'RSI 반등', simple: 'RSI가 과매도에서 상승 전환했어요', formula: 'RSI↑, 과매도 탈출' },
        ],
        exitConditions: [
            { type: '1차 익절', label: '50% 부분 익절', simple: '+5% 또는 쐐기 상단+3% 도달 시', formula: 'Profit ≥ 5% OR Price ≥ 저항선 × 103%' },
            { type: '2차 익절', label: '전량 청산', simple: 'MA20 도달 또는 +10% 도달 시', formula: 'Profit ≥ 10% OR Price ≥ MA20' },
            { type: '손절', label: '쐐기 하단 이탈', simple: '지지선(저점 연결선) 아래로 이탈', formula: 'Close < 지지선' },
        ],
        confidenceFactors: [
            { label: 'RSI 과매도 탈출', weight: '최대 30%' },
            { label: '거래량 증가', weight: '최대 25%' },
            { label: 'MA20 하단에서 반등', weight: '최대 25%' },
            { label: 'MACD 골든크로스', weight: '최대 20%' },
        ],
        tips: [
            '💡 쐐기 수렴 = 에너지 축적 중',
            '💡 거래량 동반 돌파는 강력한 신호',
            '💡 엘리어트 파동 1파 시작 패턴',
        ],
    },
    // ===== 하락 패턴 (SHORT) =====
    bearish_divergence: {
        title: '하락 다이버전스 (Bearish Divergence)',
        description: '가격은 신고점인데 RSI는 하락 - 천장 반전 신호',
        simpleExplanation: '📉 가격은 계속 오르는데 RSI는 오히려 내려가요! 이건 "상승 힘이 빠졌다"는 신호로, 곧 하락할 거란 뜻이에요.',
        analogy: '🎈 풍선을 불다가 힘이 빠지면 더 이상 커지지 않고 터지듯이, 가격도 천장을 찍으면 떨어져요.',
        timeframes: ['4시간봉 (4H)', '일봉 (1D)'],
        entryConditions: [
            { label: '가격 고점 상승', simple: '현재 가격 고점이 이전 고점보다 더 높아요', formula: 'High₂ > High₁' },
            { label: 'RSI 고점 하락', simple: '하지만 RSI는 이전보다 오히려 낮아졌어요', formula: 'RSI₂ < RSI₁ (다이버전스!)' },
            { label: 'RSI 과매수', simple: 'RSI가 60 이상의 과매수 구간이에요', formula: 'RSI(14) > 60' },
        ],
        exitConditions: [
            { type: '1차 익절', label: '50% 부분 익절', simple: '+5% 또는 RSI < 50 도달 시 절반 매도', formula: 'Profit ≥ 5% OR RSI < 50' },
            { type: '2차 익절', label: '전량 청산', simple: '+10% 또는 RSI < 30 도달 시 나머지 매도', formula: 'Profit ≥ 10% OR RSI < 30' },
            { type: '손절', label: '고점 돌파', simple: '다이버전스 시작점 고점 위로 돌파', formula: 'Close > 다이버전스 고점' },
        ],
        confidenceFactors: [
            { label: 'RSI 고점 하락폭', weight: '최대 30%' },
            { label: 'MACD 동시 다이버전스', weight: '최대 25%' },
            { label: '거래량 증가', weight: '최대 20%' },
            { label: '저항선 근접', weight: '최대 25%' },
        ],
        tips: [
            '💡 하락 다이버전스 = 상승세가 힘을 잃었다는 강력한 신호',
            '💡 과매수 구간에서 더 강력한 신호',
        ],
    },
    evening_star: {
        title: '석양형 (Evening Star)',
        description: '일봉 기준 과매수 구간 하락 반전 매도',
        simpleExplanation: '🌆 가격이 계속 오르다가 천장을 찍고 하락할 때 파는 전략이에요. 해가 지기 전 석양처럼 밝은 낮(상승) 후에 어두운 밤(하락)이 온다는 의미예요!',
        analogy: '🎢 롤러코스터가 올라가다가 정상을 찍고 다시 내려가기 시작할 때 내리는 것과 비슷해요.',
        timeframes: ['일봉 (1D)'],
        entryConditions: [
            { label: '1번 캔들: 큰 상승', simple: '가격이 크게 오른 날이 있어요 (초록색 큰 봉)', formula: 'Close > Open, Body ≥ 2%' },
            { label: '2번 캔들: 망설임', simple: '다음 날 가격이 거의 안 움직였어요 (작은 십자 모양)', formula: 'Body ≤ 0.5%' },
            { label: '3번 캔들: 하락 시작', simple: '그 다음 날 가격이 크게 떨어졌어요 (빨간색 큰 봉)', formula: 'Close < Open, Body ≥ 2%' },
            { label: 'RSI 과매수', simple: 'RSI 지표가 65 이상 = "너무 많이 샀다" 신호', formula: 'RSI(14) > 65' },
        ],
        exitConditions: [
            { type: '익절', label: 'RSI 과매도', simple: 'RSI가 30 이하 = "너무 많이 팔렸다" 신호일 때 청산', formula: 'RSI(14) < 30' },
            { type: '손절', label: '패턴 실패', simple: '가격이 다시 패턴의 최고점보다 올라가면 손절', formula: 'Close > 패턴 3봉 최고가' },
        ],
        confidenceFactors: [
            { label: 'RSI 레벨 (높을수록 Good)', weight: '최대 50%' },
            { label: '볼린저 위치 (상단 근처면 Good)', weight: '최대 30%' },
        ],
        tips: [
            '💡 "큰 상승 → 멈춤 → 하락" 3단계 패턴이 핵심이에요',
            '💡 RSI가 높을수록 "천장"일 확률이 높아요',
        ],
    },
    shooting_star: {
        title: '유성형 (Shooting Star)',
        description: '일봉 기준 긴 윗꼬리 패턴으로 하락 반전 감지',
        simpleExplanation: '☄️ 가격이 크게 올라갔다가 다시 내려와서 마감하는 패턴이에요. 유성이 하늘에서 떨어지듯이 가격도 떨어진다는 신호예요!',
        analogy: '🏀 농구공을 하늘로 던지면 최고점에서 다시 떨어지는 것처럼, 가격도 저항에 부딪히면 떨어져요.',
        timeframes: ['일봉 (1D)'],
        entryConditions: [
            { label: '상승 추세', simple: '현재 가격이 올라가는 중이에요', formula: '상승추세 확인' },
            { label: 'RSI 중립 이상', simple: 'RSI가 50 이상', formula: 'RSI(14) > 50' },
            { label: '긴 윗꼬리', simple: '위로 길게 올라갔다가 내려왔어요', formula: '(High - Close) > Body × 2' },
            { label: '짧은 아래꼬리', simple: '아래로는 별로 안 내려갔어요', formula: '(Open - Low) < Body × 50%' },
        ],
        exitConditions: [
            { type: '익절', label: 'RSI 과매도', simple: 'RSI가 30 이하 시 청산', formula: 'RSI(14) < 30' },
            { type: '손절', label: '패턴 실패', simple: '그 날의 최고점보다 더 올라가면 손절', formula: 'Close > 패턴봉 High' },
        ],
        confidenceFactors: [
            { label: '윗꼬리 길이 (길수록 Good)', weight: '최대 40%' },
            { label: '상승추세 확인', weight: '최대 25%' },
            { label: 'RSI 레벨', weight: '최대 15%' },
        ],
        tips: [
            '💡 긴 윗꼬리 = 매도세가 매수세를 이긴 증거',
            '💡 상승추세 끝에서 나오면 더 강력한 신호',
        ],
    },
    bearish_engulfing: {
        title: '하락장악형 (Bearish Engulfing)',
        description: '양봉을 완전히 감싸는 큰 음봉 패턴',
        simpleExplanation: '🔻 어제 오른 만큼을 오늘 완전히 덮어버리는 큰 하락이 나왔어요! 매도세가 완전히 장악했다는 강한 하락 신호예요.',
        analogy: '🌊 큰 파도가 작은 파도를 삼키듯이, 하락세가 상승세를 완전히 덮어버리는 거예요.',
        timeframes: ['일봉 (1D)'],
        entryConditions: [
            { label: '이전 캔들: 양봉', simple: '어제 가격이 올랐어요 (초록색)', formula: 'Prev: Close > Open' },
            { label: '현재 캔들: 큰 음봉', simple: '오늘 크게 떨어졌어요 (빨간색 큰 봉)', formula: 'Close < Open, 장악' },
            { label: '장악 패턴', simple: '오늘 음봉이 어제 양봉을 완전히 감싸요', formula: '오늘 Open > 어제 Close, 오늘 Close < 어제 Open' },
        ],
        exitConditions: [
            { type: '익절', label: 'RSI 과매도', simple: 'RSI가 30 이하 시 청산', formula: 'RSI(14) < 30' },
            { type: '손절', label: '패턴 실패', simple: '패턴 최고점 돌파 시 손절', formula: 'Close > 패턴 High' },
        ],
        confidenceFactors: [
            { label: '장악 크기 (클수록 Good)', weight: '최대 40%' },
            { label: '거래량 증가', weight: '최대 20%' },
            { label: '상승추세 확인', weight: '최대 25%' },
            { label: 'RSI 레벨', weight: '최대 15%' },
        ],
        tips: [
            '💡 장악 비율이 클수록 강한 하락 신호',
            '💡 거래량이 함께 증가하면 더 신뢰할 수 있어요',
        ],
    },
    leading_diagonal_breakdown: {
        title: '리딩다이아 하단이탈 (Leading Diagonal Breakdown)',
        description: '상승 쐐기 패턴 하단 이탈 시 하락 추세 시작 감지',
        simpleExplanation: '📐 가격이 삼각형 모양으로 수렴하다가 아래쪽으로 뚫고 나가는 패턴이에요! 하락 추세의 시작 신호예요.',
        analogy: '💧 댐의 물이 넘쳐서 아래로 쏟아지듯이, 지지선을 뚫으면 가격이 급락해요.',
        timeframes: ['일봉 (1D)'],
        entryConditions: [
            { label: '상승 쐐기 패턴', simple: '고점과 저점이 모두 수렴하는 상승 쐐기 형태', formula: '고점선, 저점선 모두 상승 + 수렴' },
            { label: '하단 이탈', simple: '지지선(저점 연결선)을 아래로 뚫었어요', formula: 'Close < 지지선' },
            { label: 'RSI 하락', simple: 'RSI가 떨어지고 있어요', formula: 'RSI↓' },
        ],
        exitConditions: [
            { type: '1차 익절', label: '50% 부분 익절', simple: '+5% 또는 쐐기 하단-3% 도달 시', formula: 'Profit ≥ 5% OR Price ≤ 지지선 × 97%' },
            { type: '2차 익절', label: '전량 청산', simple: 'MA20 도달 또는 +10% 도달 시', formula: 'Profit ≥ 10%' },
            { type: '손절', label: '쐐기 내 재진입', simple: '지지선 위로 다시 올라오면 손절', formula: 'Close > 지지선 × 103%' },
        ],
        confidenceFactors: [
            { label: '이탈 정도', weight: '최대 35%' },
            { label: '쐐기 수렴 정도', weight: '최대 25%' },
            { label: '거래량 증가', weight: '최대 20%' },
            { label: 'RSI 하락', weight: '최대 20%' },
        ],
        tips: [
            '💡 상승 쐐기 이탈 = 상승 에너지 소진',
            '💡 거래량 동반 이탈은 강력한 신호',
        ],
    },
};

type TabType = 'general' | 'api' | 'notification' | 'strategy';
type ExchangeType = 'upbit' | 'bybit';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('strategy');
    const [exchange, setExchange] = useState<ExchangeType>('upbit');
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingTelegram, setTestingTelegram] = useState(false);
    const [validatingUpbit, setValidatingUpbit] = useState(false);
    const [validatingBybit, setValidatingBybit] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form state
    const [upbitAccessKey, setUpbitAccessKey] = useState('');
    const [upbitSecretKey, setUpbitSecretKey] = useState('');
    const [telegramToken, setTelegramToken] = useState('');
    const [telegramChatId, setTelegramChatId] = useState('');
    const [isTelegramEnabled, setIsTelegramEnabled] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    // ★ Phase 9: min_confidence 제거됨
    const [strategySettings, setStrategySettings] = useState<Record<string, { enabled: boolean; name: string; description?: string; timeframe?: string; direction?: string }>>({});
    const [savingStrategy, setSavingStrategy] = useState(false);
    const [strategyTab, setStrategyTab] = useState<'long' | 'short'>('long');

    // Bybit API state
    const [bybitApiKey, setBybitApiKey] = useState('');
    const [bybitSecretKey, setBybitSecretKey] = useState('');
    const [bybitSettings, setBybitSettings] = useState<BybitSettings | null>(null);

    useEffect(() => {
        // Get exchange from localStorage
        const savedExchange = localStorage.getItem('selectedExchange') as ExchangeType;
        if (savedExchange === 'bybit' || savedExchange === 'upbit') {
            setExchange(savedExchange);
        }

        const fetchSettings = async () => {
            const exchangeToUse = (savedExchange === 'bybit' || savedExchange === 'upbit') ? savedExchange : 'upbit';
            const result = await getSettings(exchangeToUse);
            if (result.data) {
                setSettings(result.data);
                setTelegramChatId(result.data.telegram_chat_id);
                setIsTelegramEnabled(result.data.telegram_enabled);
                if (result.data.strategy_settings && exchangeToUse === 'upbit') {
                    setStrategySettings(result.data.strategy_settings);
                }
            }

            // Fetch Bybit settings if exchange is bybit
            if (exchangeToUse === 'bybit') {
                const bybitResult = await getBybitSettings();
                if (bybitResult.data) {
                    setBybitSettings(bybitResult.data);
                    if (bybitResult.data.strategy_settings) {
                        setStrategySettings(bybitResult.data.strategy_settings);
                    }
                }
            }
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleSaveUpbit = async () => {
        if (!upbitAccessKey || !upbitSecretKey) {
            setMessage({ type: 'error', text: 'API Key와 Secret Key를 모두 입력해주세요' });
            return;
        }

        setSaving(true);
        const result = await updateSettings({
            upbit_access_key: upbitAccessKey,
            upbit_secret_key: upbitSecretKey,
        });

        if (result.data?.success) {
            setMessage({ type: 'success', text: 'Upbit API 설정이 저장되었습니다' });
            setUpbitAccessKey('');
            setUpbitSecretKey('');
            const newSettings = await getSettings();
            if (newSettings.data) setSettings(newSettings.data);
        } else {
            setMessage({ type: 'error', text: result.error || '저장 실패' });
        }
        setSaving(false);
    };

    const handleValidateUpbit = async () => {
        setValidatingUpbit(true);
        const result = await validateUpbit();
        if (result.data?.valid) {
            setMessage({
                type: 'success',
                text: `API 키 유효! 잔고: ₩${Math.round(result.data.krw_balance || 0).toLocaleString()}`
            });
        } else {
            setMessage({ type: 'error', text: result.data?.message || 'API 키 검증 실패' });
        }
        setValidatingUpbit(false);
    };

    const handleSaveBybit = async () => {
        if (!bybitApiKey || !bybitSecretKey) {
            setMessage({ type: 'error', text: 'API Key와 Secret Key를 모두 입력해주세요' });
            return;
        }

        setSaving(true);
        const result = await updateBybitApiKeys(bybitApiKey, bybitSecretKey);

        if (result.data?.success) {
            setMessage({ type: 'success', text: 'Bybit API 설정이 저장되었습니다' });
            setBybitApiKey('');
            setBybitSecretKey('');
            // Refresh Bybit settings
            const bybitResult = await getBybitSettings();
            if (bybitResult.data) setBybitSettings(bybitResult.data);
        } else {
            setMessage({ type: 'error', text: result.data?.message || result.error || '저장 실패' });
        }
        setSaving(false);
    };

    const handleSaveTelegram = async () => {
        setSaving(true);
        const updates: { telegram_token?: string; telegram_chat_id?: string; telegram_enabled?: boolean } = {
            telegram_chat_id: telegramChatId,
            telegram_enabled: isTelegramEnabled,
        };

        if (telegramToken) {
            updates.telegram_token = telegramToken;
        }

        const result = await updateSettings(updates);

        if (result.data?.success) {
            setMessage({ type: 'success', text: '텔레그램 설정이 저장되었습니다' });
            setTelegramToken('');
            const newSettings = await getSettings();
            if (newSettings.data) setSettings(newSettings.data);
        } else {
            setMessage({ type: 'error', text: result.error || '저장 실패' });
        }
        setSaving(false);
    };

    const handleTestTelegram = async () => {
        setTestingTelegram(true);
        const result = await testTelegram();
        if (result.data?.success) {
            setMessage({ type: 'success', text: '테스트 메시지를 발송했습니다' });
        } else {
            setMessage({ type: 'error', text: result.data?.message || '발송 실패' });
        }
        setTestingTelegram(false);
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword) {
            setMessage({ type: 'error', text: '현재 비밀번호와 새 비밀번호를 입력해주세요' });
            return;
        }
        if (newPassword.length < 8) {
            setMessage({ type: 'error', text: '새 비밀번호는 최소 8자 이상이어야 합니다' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다' });
            return;
        }

        setChangingPassword(true);
        const result = await changePassword(currentPassword, newPassword);
        if (result.data?.success) {
            setMessage({ type: 'success', text: '비밀번호가 변경되었습니다' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            setMessage({ type: 'error', text: result.error || '비밀번호 변경 실패' });
        }
        setChangingPassword(false);
    };

    const handleSaveStrategy = async () => {
        setSavingStrategy(true);
        const result = await updateSettings({ strategy_settings: strategySettings }, exchange);
        if (result.data?.success) {
            setMessage({ type: 'success', text: '전략 설정이 저장되었습니다' });
        } else {
            setMessage({ type: 'error', text: result.error || '전략 설정 저장 실패' });
        }
        setSavingStrategy(false);
    };

    // ★ Phase 9: min_confidence 제거됨 (enabled만 사용)
    const updateStrategyConfig = (strategyId: string, field: 'enabled', value: boolean) => {
        setStrategySettings(prev => ({
            ...prev,
            [strategyId]: {
                ...prev[strategyId],
                [field]: value
            }
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
        );
    }

    const tabs = [
        { id: 'strategy' as TabType, label: '전략설정', icon: TrendingUp },
        { id: 'general' as TabType, label: '기본설정', icon: SettingsIcon },
        { id: 'api' as TabType, label: 'API 설정', icon: Key },
        { id: 'notification' as TabType, label: '알림설정', icon: MessageCircle },
    ];

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
                <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
                    <Link href={exchange === 'bybit' ? '/bybit' : '/'}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="font-bold text-base sm:text-lg">설정</h1>
                        <p className={`text-[10px] ${exchange === 'bybit' ? 'text-yellow-400' : 'text-orange-400'}`}>
                            {exchange === 'bybit' ? 'Bybit 선물' : 'Upbit 현물'}
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
                {/* Message Toast */}
                {message && (
                    <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-900/50 text-green-400 border border-green-700' : 'bg-red-900/50 text-red-400 border border-red-700'
                        }`}>
                        {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                        {message.text}
                        <button onClick={() => setMessage(null)} className="ml-auto">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-gray-900 rounded-lg overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-gray-700 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'general' && (
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="w-5 h-5 text-purple-400" />
                                비밀번호 변경
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                계정 비밀번호를 변경합니다.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="currentPassword">현재 비밀번호</Label>
                                    <Input
                                        id="currentPassword"
                                        type="password"
                                        placeholder="현재 비밀번호 입력..."
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="bg-gray-800 border-gray-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">새 비밀번호</Label>
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        placeholder="새 비밀번호 입력 (8자 이상)..."
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="bg-gray-800 border-gray-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="새 비밀번호 다시 입력..."
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="bg-gray-800 border-gray-700"
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={handleChangePassword}
                                disabled={changingPassword}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {changingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                비밀번호 변경
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'api' && (
                    <>
                        {/* Upbit API Settings - Only show for Upbit */}
                        {exchange === 'upbit' && (
                            <Card className="bg-gray-900 border-gray-800">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Key className="w-5 h-5 text-orange-400" />
                                        Upbit API 설정
                                    </CardTitle>
                                    <CardDescription className="text-gray-400">
                                        업비트 Open API 키를 설정합니다. 키는 암호화되어 저장됩니다.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Current Status */}
                                    <div className="p-3 bg-gray-800/50 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-400">Access Key</span>
                                            <Badge variant="outline" className="border-gray-600">
                                                {settings?.upbit_access_key || '미설정'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-sm text-gray-400">Secret Key</span>
                                            <Badge variant="outline" className="border-gray-600">
                                                {settings?.upbit_secret_key || '미설정'}
                                            </Badge>
                                        </div>
                                    </div>

                                    <Separator className="bg-gray-700" />

                                    {/* New Keys Input */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="accessKey">Access Key (새로 설정)</Label>
                                            <Input
                                                id="accessKey"
                                                type="password"
                                                placeholder="Access Key 입력..."
                                                value={upbitAccessKey}
                                                onChange={(e) => setUpbitAccessKey(e.target.value)}
                                                className="bg-gray-800 border-gray-700"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="secretKey">Secret Key (새로 설정)</Label>
                                            <Input
                                                id="secretKey"
                                                type="password"
                                                placeholder="Secret Key 입력..."
                                                value={upbitSecretKey}
                                                onChange={(e) => setUpbitSecretKey(e.target.value)}
                                                className="bg-gray-800 border-gray-700"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleSaveUpbit}
                                            disabled={saving}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                            저장
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={handleValidateUpbit}
                                            disabled={validatingUpbit}
                                            className="border-gray-700"
                                        >
                                            {validatingUpbit && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                            <Shield className="w-4 h-4 mr-2" />
                                            API 검증
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Bybit API Settings - Only show for Bybit */}
                        {exchange === 'bybit' && (
                            <Card className="bg-gray-900 border-gray-800">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Key className="w-5 h-5 text-yellow-400" />
                                        Bybit API 설정
                                        <Badge className="bg-yellow-600/30 text-yellow-300 border-yellow-500/50">선물</Badge>
                                    </CardTitle>
                                    <CardDescription className="text-gray-400">
                                        바이빗 API 키를 설정합니다. 실전 투자 시 필요합니다.
                                        <br />
                                        <span className="text-yellow-400 text-xs">IP 화이트리스트: 43.201.239.150</span>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Bybit Info */}
                                    <div className="p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg text-sm">
                                        <p className="text-yellow-300 font-medium mb-2">📋 Bybit 설정 요약</p>
                                        <ul className="text-gray-300 text-xs space-y-1">
                                            <li>• 거래 방향: <span className="text-green-400">롱(Long) Only</span></li>
                                            <li>• 레버리지: <span className="text-yellow-400">5x 고정</span></li>
                                            <li>• 마진 모드: <span className="text-blue-400">격리(Isolated)</span></li>
                                            <li>• 포지션당 투자: <span className="text-white">30%</span> (최대 3종목)</li>
                                            <li>• 모의 초기자금: <span className="text-white">10,000 USDT</span></li>
                                            <li>• 감시 종목: <span className="text-white">거래량 상위 30개</span></li>
                                        </ul>
                                    </div>

                                    <Separator className="bg-gray-700" />

                                    {/* Current Status */}
                                    <div className="p-3 bg-gray-800/50 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-400">API 설정 상태</span>
                                            <Badge variant="outline" className={bybitSettings?.api_configured ? 'border-green-600 text-green-400' : 'border-gray-600 text-gray-400'}>
                                                {bybitSettings?.api_configured ? '설정됨 ✓' : '미설정'}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Bybit API Input Fields */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="bybitApiKey">API Key (새로 설정)</Label>
                                            <Input
                                                id="bybitApiKey"
                                                type="password"
                                                placeholder="Bybit API Key 입력..."
                                                value={bybitApiKey}
                                                onChange={(e) => setBybitApiKey(e.target.value)}
                                                className="bg-gray-800 border-gray-700"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="bybitSecretKey">Secret Key (새로 설정)</Label>
                                            <Input
                                                id="bybitSecretKey"
                                                type="password"
                                                placeholder="Bybit Secret Key 입력..."
                                                value={bybitSecretKey}
                                                onChange={(e) => setBybitSecretKey(e.target.value)}
                                                className="bg-gray-800 border-gray-700"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleSaveBybit}
                                            disabled={saving}
                                            className="bg-yellow-600 hover:bg-yellow-700"
                                        >
                                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                            저장
                                        </Button>
                                    </div>

                                    <div className="p-3 bg-gray-800/50 rounded-lg text-gray-400 text-xs">
                                        <p className="mb-1">💡 <span className="text-white">API 키 발급 방법:</span></p>
                                        <ol className="list-decimal list-inside space-y-1 ml-2">
                                            <li>Bybit 웹사이트 로그인 → API 관리</li>
                                            <li>새 API 키 생성 (권한: 읽기 + USDT 무기한 거래)</li>
                                            <li>IP 화이트리스트에 <span className="text-yellow-400">43.201.239.150</span> 추가</li>
                                        </ol>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}

                {activeTab === 'notification' && (
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-blue-400" />
                                Telegram 알림 설정
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                거래 알림을 받을 텔레그램 봇을 설정합니다.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Enable Toggle */}
                            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                                <div>
                                    <p className="font-medium">알림 활성화</p>
                                    <p className="text-sm text-gray-400">거래 체결 시 텔레그램 알림을 받습니다</p>
                                </div>
                                <Switch
                                    checked={isTelegramEnabled}
                                    onCheckedChange={setIsTelegramEnabled}
                                    className="data-[state=checked]:bg-blue-600"
                                />
                            </div>

                            <Separator className="bg-gray-700" />

                            {/* Current Status */}
                            <div className="p-3 bg-gray-800/50 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-400">Bot Token</span>
                                    <Badge variant="outline" className="border-gray-600">
                                        {settings?.telegram_token || '미설정'}
                                    </Badge>
                                </div>
                            </div>

                            {/* Telegram Settings */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="telegramToken">Bot Token (새로 설정)</Label>
                                    <Input
                                        id="telegramToken"
                                        type="password"
                                        placeholder="Bot Token 입력..."
                                        value={telegramToken}
                                        onChange={(e) => setTelegramToken(e.target.value)}
                                        className="bg-gray-800 border-gray-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="chatId">Chat ID</Label>
                                    <Input
                                        id="chatId"
                                        placeholder="Chat ID 입력..."
                                        value={telegramChatId}
                                        onChange={(e) => setTelegramChatId(e.target.value)}
                                        className="bg-gray-800 border-gray-700"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={handleSaveTelegram}
                                    disabled={saving}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    저장
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleTestTelegram}
                                    disabled={testingTelegram}
                                    className="border-gray-700"
                                >
                                    {testingTelegram && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    테스트 발송
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'strategy' && (
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-green-400" />
                                트레이딩 전략 설정
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                각 전략의 활성화 여부와 최소 신뢰도 기준을 설정합니다.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Long/Short Tab Selection */}
                            <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg w-fit">
                                <button
                                    onClick={() => setStrategyTab('long')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${(strategyTab || 'long') === 'long'
                                        ? 'bg-green-600 text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                        }`}
                                >
                                    📈 롱 전략
                                </button>
                                <button
                                    onClick={() => setStrategyTab('short')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${strategyTab === 'short'
                                        ? 'bg-red-600 text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                        }`}
                                >
                                    📉 숏 전략
                                </button>
                            </div>

                            {Object.keys(strategySettings).length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>전략 설정을 불러오는 중...</p>
                                </div>
                            ) : (
                                Object.entries(strategySettings)
                                    .filter(([, config]) => {
                                        const isShort = config.direction === 'short';
                                        return strategyTab === 'short' ? isShort : !isShort;
                                    })
                                    .map(([strategyId, config]) => (
                                        <div key={strategyId} className="p-4 bg-gray-800/50 rounded-lg space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-white">{config.name}</p>
                                                        {/* Strategy Guide Button */}
                                                        {strategyGuides[strategyId] && (
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30">
                                                                        <HelpCircle className="w-4 h-4 mr-1" />
                                                                        <span className="text-xs">가이드</span>
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[85vh] overflow-y-auto">
                                                                    <DialogHeader>
                                                                        <DialogTitle className="text-xl flex items-center gap-2">
                                                                            <TrendingUp className="w-5 h-5 text-green-400" />
                                                                            {strategyGuides[strategyId].title}
                                                                        </DialogTitle>
                                                                        <DialogDescription className="text-gray-400">
                                                                            {strategyGuides[strategyId].description}
                                                                        </DialogDescription>
                                                                    </DialogHeader>

                                                                    <div className="space-y-6 mt-4">
                                                                        {/* Simple Explanation */}
                                                                        <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                                                                            <p className="text-blue-200 text-sm leading-relaxed">
                                                                                {strategyGuides[strategyId].simpleExplanation}
                                                                            </p>
                                                                            <p className="text-blue-300/70 text-xs mt-2 italic">
                                                                                {strategyGuides[strategyId].analogy}
                                                                            </p>
                                                                        </div>

                                                                        {/* Timeframes */}
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <span className="text-gray-400 text-sm">⏰ 분석 주기:</span>
                                                                            {strategyGuides[strategyId].timeframes.map((tf: string, idx: number) => (
                                                                                <Badge key={idx} variant="outline" className="border-blue-500 text-blue-400">
                                                                                    {tf}
                                                                                </Badge>
                                                                            ))}
                                                                        </div>

                                                                        {/* Entry Conditions */}
                                                                        <div className="space-y-3">
                                                                            <h4 className="flex items-center gap-2 font-semibold text-green-400">
                                                                                <ArrowUpCircle className="w-5 h-5" />
                                                                                📥 이럴 때 사요 (진입 조건)
                                                                            </h4>
                                                                            <div className="space-y-2">
                                                                                {strategyGuides[strategyId].entryConditions.map((cond: { label: string; simple: string; formula?: string }, idx: number) => (
                                                                                    <div key={idx} className="p-3 bg-gray-800 rounded-lg">
                                                                                        <div className="flex items-start gap-2">
                                                                                            <span className="text-green-500 font-bold text-sm">{idx + 1}.</span>
                                                                                            <div>
                                                                                                <p className="text-white text-sm font-medium">{cond.label}</p>
                                                                                                <p className="text-gray-300 text-xs mt-1">{cond.simple}</p>
                                                                                                {cond.formula && (
                                                                                                    <code className="text-[10px] text-blue-300 bg-gray-700 px-2 py-0.5 rounded mt-1 inline-block">
                                                                                                        {cond.formula}
                                                                                                    </code>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        {/* Exit Conditions */}
                                                                        <div className="space-y-3">
                                                                            <h4 className="flex items-center gap-2 font-semibold text-red-400">
                                                                                <ArrowDownCircle className="w-5 h-5" />
                                                                                📤 이럴 때 팔아요 (청산 조건)
                                                                            </h4>
                                                                            <div className="space-y-2">
                                                                                {strategyGuides[strategyId].exitConditions.map((cond: { type: string; label: string; simple: string; formula?: string }, idx: number) => (
                                                                                    <div key={idx} className="p-3 bg-gray-800 rounded-lg flex items-start gap-3">
                                                                                        <Badge
                                                                                            className={cond.type === '익절' ? 'bg-green-600' : 'bg-red-600'}
                                                                                        >
                                                                                            {cond.type}
                                                                                        </Badge>
                                                                                        <div>
                                                                                            <p className="text-white text-sm font-medium">{cond.label}</p>
                                                                                            <p className="text-gray-300 text-xs mt-1">{cond.simple}</p>
                                                                                            {cond.formula && (
                                                                                                <code className="text-[10px] text-blue-300 bg-gray-700 px-2 py-0.5 rounded mt-1 inline-block">
                                                                                                    {cond.formula}
                                                                                                </code>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        {/* Confidence Calculation */}
                                                                        <div className="space-y-3">
                                                                            <h4 className="flex items-center gap-2 font-semibold text-purple-400">
                                                                                <Target className="w-5 h-5" />
                                                                                🎯 신뢰도 계산
                                                                            </h4>
                                                                            <div className="p-3 bg-gray-800 rounded-lg">
                                                                                <p className="text-gray-400 text-xs mb-2">조건이 좋을수록 신뢰도가 올라가요 (20%~100%)</p>
                                                                                <div className="space-y-2">
                                                                                    {strategyGuides[strategyId].confidenceFactors.map((factor: { label: string; weight: string }, idx: number) => (
                                                                                        <div key={idx} className="flex justify-between items-center">
                                                                                            <span className="text-gray-300 text-sm">{factor.label}</span>
                                                                                            <Badge variant="outline" className="border-purple-500 text-purple-400">
                                                                                                {factor.weight}
                                                                                            </Badge>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Tips */}
                                                                        <div className="space-y-3">
                                                                            <h4 className="flex items-center gap-2 font-semibold text-yellow-400">
                                                                                <AlertTriangle className="w-5 h-5" />
                                                                                꿀팁
                                                                            </h4>
                                                                            <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                                                                                <ul className="space-y-2">
                                                                                    {strategyGuides[strategyId].tips.map((tip: string, idx: number) => (
                                                                                        <li key={idx} className="text-yellow-200/80 text-sm">
                                                                                            {tip}
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-400">{config.description}</p>
                                                    <p className="text-xs text-gray-500 mt-1">타임프레임: {config.timeframe}</p>
                                                </div>
                                                <Switch
                                                    checked={config.enabled}
                                                    onCheckedChange={(checked) => updateStrategyConfig(strategyId, 'enabled', checked)}
                                                    className="data-[state=checked]:bg-green-600"
                                                />
                                                {/* ★ Phase 9: min_confidence 슬라이더 제거 (신뢰도 체크 폐지) */}
                                            </div>
                                        </div>
                                    ))
                            )}

                            <Button
                                onClick={handleSaveStrategy}
                                disabled={savingStrategy || Object.keys(strategySettings).length === 0}
                                className="w-full bg-green-600 hover:bg-green-700"
                            >
                                {savingStrategy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                전략 설정 저장
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Info */}
                <Card className="bg-gray-800/30 border-gray-800">
                    <CardContent className="py-4">
                        <p className="text-sm text-gray-500 text-center">
                            💡 API 키와 토큰은 Fernet 암호화로 안전하게 저장됩니다.
                            실전 거래 전 반드시 모의투자 모드에서 충분히 테스트해주세요.
                        </p>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
