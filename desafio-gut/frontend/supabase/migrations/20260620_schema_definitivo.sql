-- 20260620_schema_definitivo.sql — MC32.1
--
-- Esquema definitivo do Supabase para a camada de dados central do DESAFIOGUT.
-- Já EXECUTADO manualmente no painel do projeto `vjslwowwrpcawijdiksm` pelo
-- operador (R13) e validado pelo QA. Versionado aqui como única fonte de verdade
-- do schema (Item 1.2). NÃO editar à mão no Supabase sem refletir aqui.
--
-- Tabelas: produtos, lojistas, lances, config_remota.
-- RLS: ativa em todas; leitura pública só em produtos e config_remota; escrita
-- exclusiva do service_role (backend) em lances/lojistas/config_remota.

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  imagem TEXT,
  categoria TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de lojistas
CREATE TABLE IF NOT EXISTS lojistas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endereco VARCHAR(42) UNIQUE NOT NULL,
  cota TEXT CHECK (cota IN ('bronze', 'prata', 'ouro', 'diamante')),
  saldo_senhas INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de lances
CREATE TABLE IF NOT EXISTS lances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  edicao_id VARCHAR(66) NOT NULL,
  endereco VARCHAR(42) NOT NULL,
  hash_lance VARCHAR(66) NOT NULL,
  valor_centavos INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Configuração Remota
CREATE TABLE IF NOT EXISTS config_remota (
  chave VARCHAR PRIMARY KEY,
  valor_booleano BOOLEAN DEFAULT false,
  versao_alvo VARCHAR DEFAULT '1.0.0',
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lances_edicao_id ON lances(edicao_id);
CREATE INDEX IF NOT EXISTS idx_lances_endereco ON lances(endereco);
CREATE INDEX IF NOT EXISTS idx_lojistas_endereco ON lojistas(endereco);

ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lojistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lances ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_remota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de produtos" ON produtos FOR SELECT USING (true);
CREATE POLICY "Leitura pública de configurações" ON config_remota FOR SELECT USING (true);
CREATE POLICY "Acesso total exclusivo service_role" ON lances FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Gerenciamento exclusivo service_role lojistas" ON lojistas FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Gerenciamento exclusivo service_role config" ON config_remota FOR ALL TO service_role USING (true) WITH CHECK (true);
