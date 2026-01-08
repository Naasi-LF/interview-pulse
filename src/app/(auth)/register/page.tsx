"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const { signUp, signInWithGoogle } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return setError("Passwords do not match");
        }
        try {
            setError("");
            await signUp(email, password);
        } catch (err: any) {
            setError("创建账户失败。" + err.message);
        }
    };

    return (
        <Card className="w-full border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="space-y-4 pt-10 px-10">
                <div className="flex justify-center mb-2">
                    <div className="h-16 w-16 rounded-full bg-orange-50 flex items-center justify-center shadow-inner">
                        <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                </div>
                <div className="space-y-2 text-center">
                    <CardTitle className="text-3xl font-black tracking-tight font-heading text-foreground">创建账户</CardTitle>
                    <CardDescription className="text-base text-muted-foreground">
                        开启您的职业成长新篇章
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="px-10 pb-10 space-y-6">
                {error && (
                    <div className="p-3 text-sm font-medium text-red-600 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-foreground/80 font-semibold ml-1">电子邮箱</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="hello@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="rounded-2xl h-12 bg-gray-50 border-transparent focus:bg-white transition-all pl-4"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-foreground/80 font-semibold ml-1">密码</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="rounded-2xl h-12 bg-gray-50 border-transparent focus:bg-white transition-all pl-4"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-foreground/80 font-semibold ml-1">确认密码</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="rounded-2xl h-12 bg-gray-50 border-transparent focus:bg-white transition-all pl-4"
                        />
                    </div>
                    <Button type="submit" className="w-full h-14 rounded-full text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all mt-2" variant="default">
                        注册账户
                    </Button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-100" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase font-bold tracking-wider">
                        <span className="bg-white px-4 text-gray-400">
                            或者
                        </span>
                    </div>
                </div>

                <Button variant="outline" type="button" className="w-full h-12 rounded-full border-gray-200 text-gray-600 font-semibold hover:bg-gray-50" onClick={signInWithGoogle}>
                    <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    使用 Google 注册
                </Button>
            </CardContent>
            <CardFooter className="bg-gray-50/50 p-6 flex justify-center">
                <div className="text-sm text-center w-full text-gray-500 font-medium">
                    已有账号？{" "}
                    <Link href="/login" className="text-primary hover:text-orange-600 hover:underline font-bold">
                        立即登录
                    </Link>
                </div>
            </CardFooter>
        </Card>
    );
}
