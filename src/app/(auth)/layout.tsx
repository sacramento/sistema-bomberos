export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-background">
        {children}
         {/* Decorative corner element */}
        <div aria-hidden="true" className="pointer-events-none fixed bottom-0 right-0 h-full w-full">
            <div className="absolute bottom-0 right-0 h-0 w-0 border-b-[500px] border-l-[500px] border-b-red-900/50 border-l-transparent" />
            <div className="absolute bottom-0 right-0 h-0 w-0 border-b-[350px] border-l-[350px] border-b-red-700/50 border-l-transparent" />
            <div className="absolute bottom-0 right-0 h-0 w-0 border-b-[200px] border-l-[200px] border-b-red-500/50 border-l-transparent" />
        </div>
    </div>
  );
}
