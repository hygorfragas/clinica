-- Frases rotativas exibidas no card de boas-vindas da tela /inicio.
-- Globais para a plataforma (não dependem de tenant); a lógica de qual
-- categoria pegar conforme dia+período mora no app (lib/dashboard/phrases.ts).

create table if not exists public.dashboard_phrases (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('motivational', 'hopeful', 'joyful', 'warm')),
  text text not null check (length(trim(text)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists dashboard_phrases_category_active_idx
  on public.dashboard_phrases (category, is_active);

comment on table public.dashboard_phrases is
  'Frases motivacionais/carinhosas/etc. exibidas em rotação na dashboard. Globais.';
comment on column public.dashboard_phrases.category is
  'Categoria temática: motivational, hopeful, joyful ou warm. App escolhe a categoria conforme dia da semana + período do dia.';

alter table public.dashboard_phrases enable row level security;

-- Qualquer usuário autenticado pode ler. Mutação fica reservada ao service role
-- (admins da plataforma manipulam direto via SQL ou ferramentas internas).
drop policy if exists dashboard_phrases_read on public.dashboard_phrases;
create policy dashboard_phrases_read
  on public.dashboard_phrases for select
  to authenticated
  using (true);

grant select on public.dashboard_phrases to authenticated;
grant select, insert, update, delete on public.dashboard_phrases to service_role;

-- ============================================================================
-- Seed inicial — só insere se a tabela estiver vazia (idempotente).
-- ============================================================================

do $$
begin
  if not exists (select 1 from public.dashboard_phrases) then
    insert into public.dashboard_phrases (category, text) values
    -- 💪 Motivacionais
    ('motivational', 'Hoje é dia de fazer acontecer 💥'),
    ('motivational', 'Pequenas ações, grandes resultados'),
    ('motivational', 'Mais um dia pra evoluir 🚀'),
    ('motivational', 'Disciplina hoje, sucesso amanhã'),
    ('motivational', 'Você não precisa ser perfeito, só consistente'),
    ('motivational', 'O sucesso começa com o primeiro atendimento do dia'),
    ('motivational', 'Bora transformar metas em resultados 📈'),
    ('motivational', 'Seu esforço de hoje é o faturamento de amanhã'),
    ('motivational', 'Um passo de cada vez já te coloca na frente'),
    ('motivational', 'Clientes felizes começam com você'),
    ('motivational', 'Foque no progresso, não na pressa'),
    ('motivational', 'Hoje é dia de dar orgulho pro seu “eu do futuro”'),
    ('motivational', 'Faça com excelência, mesmo no básico'),
    ('motivational', 'Grandes clínicas são feitas de pequenos hábitos'),
    ('motivational', 'Comece — o resto se ajusta'),
    ('motivational', 'O melhor momento é agora ⏱️'),
    ('motivational', 'Você está construindo algo grande'),
    ('motivational', 'Mais ação, menos desculpa 😉'),
    ('motivational', 'Consistência vence talento'),
    ('motivational', 'Bora lotar essa agenda! 🔥'),

    -- 🌈 Esperança
    ('hopeful', 'Vai dar certo, confia ✨'),
    ('hopeful', 'Cada dia te aproxima do que você quer'),
    ('hopeful', 'O que você planta hoje, floresce amanhã 🌸'),
    ('hopeful', 'Dias difíceis também passam'),
    ('hopeful', 'Você já venceu muita coisa até aqui'),
    ('hopeful', 'Coisas boas estão a caminho'),
    ('hopeful', 'Tudo está se encaixando, mesmo que você não veja ainda'),
    ('hopeful', 'Seu esforço não é em vão 💖'),
    ('hopeful', 'Tenha calma, você está no caminho certo'),
    ('hopeful', 'A sua hora está chegando'),
    ('hopeful', 'Confie no processo'),
    ('hopeful', 'O melhor ainda está por vir 🌟'),
    ('hopeful', 'Você é capaz de muito mais do que imagina'),
    ('hopeful', 'Um dia de cada vez — e tudo se resolve'),
    ('hopeful', 'Respira… vai dar tudo certo 😊'),
    ('hopeful', 'Seu trabalho está gerando resultados, mesmo que aos poucos'),
    ('hopeful', 'Continue, você está mais perto do que pensa'),
    ('hopeful', 'O universo gosta de quem não desiste'),
    ('hopeful', 'O bem que você faz sempre volta'),
    ('hopeful', 'Hoje pode ser o dia da virada 💫'),

    -- 😄 Alegres
    ('joyful', 'Agenda vazia? Nem combina com você 😏'),
    ('joyful', 'Bora fazer esse caixa sorrir hoje? 😄💰'),
    ('joyful', 'Cliente feliz = coração quentinho ❤️'),
    ('joyful', 'Mais um dia pra deixar todo mundo mais bonito 😌✨'),
    ('joyful', 'Hoje é dia de brilhar mais que pele com glow 🌟'),
    ('joyful', 'Sua agenda merece lotação máxima! 🚨'),
    ('joyful', 'Sem drama, só dermo 😂'),
    ('joyful', 'Atendimento feito com amor rende até indicação 💖'),
    ('joyful', 'Hoje o filtro é na vida real 😎'),
    ('joyful', 'Bora faturar que boleto não espera 😅'),
    ('joyful', 'Se depender de você, o dia vai ser lindo 💅'),
    ('joyful', 'Glow up de clientes e do faturamento ✨'),
    ('joyful', 'Mais autoestima saindo pela porta 🚪💖'),
    ('joyful', 'Seu talento não cabe na agenda… mas a gente tenta 😄'),
    ('joyful', 'Cliente entrou, autoestima saiu lá em cima 🚀'),
    ('joyful', 'Hoje tem milagre estético? Tem sim 😆'),
    ('joyful', 'Sorriso no rosto e agenda cheia 😁'),
    ('joyful', 'Bora deixar esse dia mais bonito?'),
    ('joyful', 'Aqui o resultado aparece 😉'),
    ('joyful', 'Spoiler: hoje vai render 💸'),

    -- 🤗 Carinhosas
    ('warm', 'Que bom ter você aqui hoje 💖'),
    ('warm', 'Seu cuidado transforma vidas'),
    ('warm', 'Você faz a diferença todos os dias 🌷'),
    ('warm', 'Seu trabalho é mais importante do que parece'),
    ('warm', 'Você cuida de pessoas — isso é incrível'),
    ('warm', 'Que seu dia seja leve e produtivo 🌼'),
    ('warm', 'Obrigado por fazer seu melhor sempre'),
    ('warm', 'Seu carinho chega até cada cliente'),
    ('warm', 'Você é essencial por aqui 💕'),
    ('warm', 'Hoje vai ser um dia bonito — igual ao seu trabalho'),
    ('warm', 'Continue espalhando autoestima'),
    ('warm', 'Seu talento merece reconhecimento 🌟'),
    ('warm', 'Cada atendimento seu deixa alguém mais feliz'),
    ('warm', 'Você merece um dia incrível'),
    ('warm', 'Seu esforço inspira 💫'),
    ('warm', 'Que seu dia seja cheio de boas energias'),
    ('warm', 'Você está indo muito bem 😊'),
    ('warm', 'Seu cuidado faz o mundo melhor'),
    ('warm', 'Que hoje seja leve, produtivo e feliz'),
    ('warm', 'Você não está sozinho nessa jornada 🤍');
  end if;
end$$;
