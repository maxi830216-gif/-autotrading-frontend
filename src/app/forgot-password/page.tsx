'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || '요청 처리에 실패했습니다');
            }

            setIsSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : '오류가 발생했습니다');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-gray-900 border-gray-800">
                    <CardContent className="pt-8 pb-8 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-400" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">비밀번호 재설정 안내</h2>
                        <p className="text-gray-400 mb-6">
                            입력하신 이메일 주소로 비밀번호 재설정 안내가 전송되었습니다.
                            <br />
                            <span className="text-sm">(등록된 이메일인 경우에만 발송됩니다)</span>
                        </p>
                        <Link href="/login">
                            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                로그인으로 돌아가기
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-gray-900 border-gray-800">
                <CardHeader>
                    <Link
                        href="/login"
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        로그인으로 돌아가기
                    </Link>
                    <CardTitle className="text-2xl font-bold text-white">비밀번호 찾기</CardTitle>
                    <p className="text-gray-400 text-sm mt-2">
                        가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-300">이메일</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            disabled={isLoading}
                        >
                            {isLoading ? '전송 중...' : '비밀번호 재설정 링크 받기'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}
