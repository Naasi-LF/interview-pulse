export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden bg-[#FDFBF7]">
            {/* Soft Blobs Background */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-orange-200/40 rounded-full blur-[100px] animate-blob" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-yellow-200/40 rounded-full blur-[100px] animate-blob animation-delay-2000" />

            <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500">
                {children}
            </div>
        </div>
    );
}
