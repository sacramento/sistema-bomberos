export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-background">
        {children}
         {/* Decorative corner element - now with a hard shadow */}
        <div aria-hidden="true" className="pointer-events-none fixed bottom-0 right-0 h-full w-full">
            {/* Hard shadow layer */}
            <div className="absolute bottom-0 right-0 h-0 w-0 border-b-[610px] border-l-[610px] border-b-gray-900/50 border-l-transparent" />
            {/* Largest, darkest triangle */}
            <div className="absolute bottom-0 right-0 h-0 w-0 border-b-[600px] border-l-[600px] border-b-red-900 border-l-transparent" />
            {/* Medium triangle */}
            <div className="absolute bottom-0 right-0 h-0 w-0 border-b-[400px] border-l-[400px] border-b-red-700 border-l-transparent" />
            {/* Smallest, lightest triangle */}
            <div className="absolute bottom-0 right-0 h-0 w-0 border-b-[200px] border-l-[200px] border-b-red-500 border-l-transparent" />
        </div>
    </div>
  );
}
