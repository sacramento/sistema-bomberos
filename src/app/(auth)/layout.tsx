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
            <div className="absolute bottom-0 right-0 h-0 w-0 border-b-[600px] border-l-[600px] border-b-red-900 border-l-transparent" style={{filter: 'drop-shadow(8px -8px 16px rgba(0,0,0,0.1))'}} />
            <div className="absolute bottom-0 right-0 h-0 w-0 border-b-[400px] border-l-[400px] border-b-red-700 border-l-transparent" style={{filter: 'drop-shadow(8px -8px 16px rgba(0,0,0,0.1))'}} />
            <div className="absolute bottom-0 right-0 h-0 w-0 border-b-[200px] border-l-[200px] border-b-red-500 border-l-transparent" style={{filter: 'drop-shadow(8px -8px 16px rgba(0,0,0,0.1))'}} />
        </div>
    </div>
  );
}
