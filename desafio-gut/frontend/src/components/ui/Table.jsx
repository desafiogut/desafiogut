import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Table — MC21.1
 * Tabela translúcida: header em vidro, linhas separadas por border-white/5,
 * hover bg-white/[0.03]. A arena permanece visível (Regra de Ouro). Sem fundo opaco.
 */
function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

function THead({ className, ...props }) {
  return (
    <thead
      className={cn("glass-panel text-left text-white/70 uppercase text-xs tracking-wide", className)}
      {...props}
    />
  );
}

const TBody = (p) => <tbody {...p} />;

function TR({ className, ...props }) {
  return (
    <tr
      className={cn("border-b border-white/5 transition-colors hover:bg-white/[0.03]", className)}
      {...props}
    />
  );
}

function TH({ className, ...props }) {
  return <th className={cn("px-4 py-3 font-semibold", className)} {...props} />;
}

function TD({ className, ...props }) {
  return <td className={cn("px-4 py-3 text-[var(--color-gut-text)]", className)} {...props} />;
}

export { Table, THead, TBody, TR, TH, TD };
export default Table;
