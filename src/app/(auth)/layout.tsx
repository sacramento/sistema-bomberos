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
            <div className="absolute bottom-0 right-0 h-[500px] w-[500px] translate-y-1/2 translate-x-1/2 -rotate-45 transform-gpu bg-red-900 shadow-2xl shadow-red-900/50" />
            <div className="absolute bottom-0 right-0 h-[350px] w-[350px] translate-y-1/2 translate-x-1/3 -rotate-45 transform-gpu bg-red-700 shadow-2xl shadow-red-800/50" />
            <div className="absolute bottom-0 right-0 h-[200px] w-[200px] translate-y-1/3 translate-x-1/4 -rotate-45 transform-gpu bg-red-500 shadow-2xl shadow-red-700/50" />
        </div>
    </div>
  );
}
