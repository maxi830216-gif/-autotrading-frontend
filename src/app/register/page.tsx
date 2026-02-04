'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate passwords match
        if (password !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다');
            return;
        }

        // Validate password length
        if (password.length < 8) {
            setError('비밀번호는 최소 8자 이상이어야 합니다');
            return;
        }

        setIsLoading(true);

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || '회원가입에 실패했습니다');
            }

            // Save token to localStorage
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect to dashboard
            router.push('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : '회원가입에 실패했습니다');
        } finally {
            setIsLoading(false);
        }
    };

    const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
    const passwordLongEnough = password.length >= 8;

    return (
        <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-gray-900 border-gray-800">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">회원가입</CardTitle>
                    <p className="text-gray-400 text-sm mt-2">새 계정을 만들어 시작하세요</p>
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
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-gray-300">비밀번호</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                                {passwordLongEnough ? (
                                    <CheckCircle className="w-3 h-3 text-green-400" />
                                ) : (
                                    <AlertCircle className="w-3 h-3 text-gray-500" />
                                )}
                                <span className={passwordLongEnough ? 'text-green-400' : 'text-gray-500'}>
                                    최소 8자 이상
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-gray-300">비밀번호 확인</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                            {confirmPassword.length > 0 && (
                                <div className="flex items-center gap-1 text-xs">
                                    {passwordsMatch ? (
                                        <>
                                            <CheckCircle className="w-3 h-3 text-green-400" />
                                            <span className="text-green-400">비밀번호 일치</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="w-3 h-3 text-red-400" />
                                            <span className="text-red-400">비밀번호 불일치</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            disabled={isLoading || !passwordsMatch || !passwordLongEnough}
                        >
                            {isLoading ? '가입 중...' : '회원가입'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-400 text-sm">
                            이미 계정이 있으신가요?{' '}
                            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                                로그인
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
