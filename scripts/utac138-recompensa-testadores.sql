-- UTAC138 (Frente A) — recompensa única de 400 PONTOS DE LANCE aos testadores do teste fechado.
-- Decisão do operador R18-138-C (2026-11-17): «as 28 com atividade» = os 28 endereços de
-- public.atividade_utilizadores medidos no SEG-1 (lista CONGELADA abaixo: quem aparecer depois não entra).
--
-- Ledger: public.pontos.pontos_lance + historico_lance (o mesmo de _lib/ledger-lance.mjs). A entrada tem a
-- forma exacta que o código escreve: { data, campo:"pontos_lance", motivo:"recompensa-teste", delta:400, ref }.
-- IDEMPOTENTE pela ref 'recompensa-teste-v1': correr 2× não credita 2× (o WHERE do ON CONFLICT salta quem já
-- a tem; o INSERT só acontece para quem ainda não tem linha). Não apaga nem reduz nenhum ponto existente.
-- Os escritores do código usam CAS sobre atualizado_em ⇒ um escritor concorrente relê e repete (sem lost update).

with alvos(endereco) as (values
  ('0x1e1bae7f0f6e87e15f430b620eca42b146d198cb'),
  ('0x5baf46609dd9188e081cc78f70e61a6ea07f32b8'),
  ('0xe39ce40f2d8d6e7ff3fda4c84f77e2577a929e45'),
  ('0x6ac980dc94b2f4841e1bc5a703a989447637674d'),
  ('0xffe39a34f305ef917fa3937369adad025ce38a25'),
  ('0x12bf69be3f7d16321e13ee2fb79e3385d2f98586'),
  ('0xc96cdf89cac9b5c39922df627e9e590d33215f28'),
  ('0x9032969e07956e3f1c6d931bea1d9ca2d2a68162'),
  ('0xb7abf879255683c6a6d0424164a688170603fa5c'),
  ('0x0f7e36653cda0ae0788a005fa4f7cb1feb78a122'),
  ('0xce048f4f9c554e657b9b2d4332c4cde4b1304b70'),
  ('0x7227ca51fed4afd597602b314a6379bd5556858e'),
  ('0x5518ca28100c7ce9a34dc2476c11740987ded037'),
  ('0xd9871d447bc0c80591e6f97f592cf2a9954cb0b6'),
  ('0xca9c2f2bb2528022ab0969ce4ad6aad35dd76bea'),
  ('0x88e66d8898d76979cda75dc3358830111e4b3bc7'),
  ('0x10cf385baae663bca5fdff7c17a119a73545ce3f'),
  ('0xe89b433dfad8feaedd592a3ecb5d77cf51eabee1'),
  ('0x90a053cd5b7ce83eddc6dece09ae634d93cd58a0'),
  ('0x2118407edf72fef565dbdfd6cbf4c52b85681a58'),
  ('0xdc241cab69541af55becbb5ab2b924a9ed61773d'),
  ('0xb9a93168f299379aa8a0b4f5f617cf6cba090261'),
  ('0x0052d253c4cd70af59680669098998c4045665ac'),
  ('0x7abf6502887cf26d4d8495f89b9be3dea687b4f3'),
  ('0x81c1f6164c9e49bcf1f1a3a9604f8bd2af36b8cf'),
  ('0x1fb186afd1b9a68816a63c61917b1d7d2c4ba6a4'),
  ('0xa0d2360a74018e5e739e0f9e8abd623b7b994811'),
  ('0x163bf07e0db81bb3604b361734efe0eb5f34b643')
),
entrada as (
  select jsonb_build_object(
    'data',   to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'campo',  'pontos_lance',
    'motivo', 'recompensa-teste',
    'delta',  400,
    'ref',    'recompensa-teste-v1'
  ) as e
)
insert into public.pontos as p (endereco, pontos, historico, creditos_lance, pontos_lance, historico_lance, atualizado_em)
select a.endereco, 0, '[]'::jsonb, 0, 400, jsonb_build_array(entrada.e), now()
from alvos a cross join entrada
on conflict (endereco) do update set
  pontos_lance    = p.pontos_lance + 400,
  historico_lance = p.historico_lance || excluded.historico_lance,
  atualizado_em   = now()
where not exists (
  select 1 from jsonb_array_elements(p.historico_lance) h where h->>'ref' = 'recompensa-teste-v1'
)
returning p.endereco, p.pontos_lance;
