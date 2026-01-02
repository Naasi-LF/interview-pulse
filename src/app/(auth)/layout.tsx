export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden">
            <div className="aurora-bg" />
            <div className="w-full max-w-md relative z-10">
                {children}
            </div>
        </div>
    );
}
