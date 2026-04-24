import { cn } from "@/lib/utils";

/** Bloco genérico animado — use className para dimensionar. */
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md",
        className
      )}
      style={{ background: "rgba(255,255,255,0.07)", ...props.style }}
      {...props}
    />
  );
}

/** Par label + valor, usado em exibições de saldo. */
export function SaldoSkeleton({ className } = {}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Skeleton className="h-2.5 w-14" />
      <Skeleton className="h-5 w-24" />
    </div>
  );
}

/** Linha de tabela esqueleto — 3 colunas. */
export function LinhaSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-20 ml-auto" />
    </div>
  );
}

/** Bloco de carregamento de saldo com ETH + fichas. */
export function CarteiraSkeleton() {
  return (
    <div className="flex gap-6 items-center">
      <SaldoSkeleton />
      <SaldoSkeleton />
    </div>
  );
}
