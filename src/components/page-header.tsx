import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8", className)}>
      <div className="grid gap-1">
        <h1 className="font-headline text-3xl md:text-4xl font-semibold tracking-tight">
          {title}
        </h1>
        {description && (
          <div className="text-muted-foreground">{description}</div>
        )}
      </div>
      {children && <div className="flex items-center gap-2 w-full md:w-auto justify-end">{children}</div>}
    </div>
  );
}
