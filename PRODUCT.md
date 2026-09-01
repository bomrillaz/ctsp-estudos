# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Bombeiro militar do CBMRS estudando para o CTSP 2026, o concurso interno de promoção a 2º Sargento.
Estuda em janelas curtas de tempo (plantão, folga), majoritariamente pelo celular — o PWA precisa se
comportar como app instalado mesmo antes de ser instalado. Público não é técnico nem early-adopter;
espera uma ferramenta séria e confiável, não um produto de consumo.

## Product Purpose

Plataforma de estudo com banco de questões, flashcards e resumos 100% autorais, motor de repetição
espaçada (FSRS) e modelo de domínio por tópico (BKT) que prioriza o que o usuário realmente precisa
revisar. Sucesso é o usuário chegar preparado ao CTSP 2026 com o mínimo de tempo desperdiçado em
conteúdo que já domina.

## Positioning

Não é um cursinho genérico nem um app de flashcards qualquer: o conteúdo é autoral, calibrado pelas
cotas reais do edital (AT1-AT5) e pelo motor adaptativo (FSRS + BKT) que decide o que revisar a cada
sessão — um concorrente não pode copiar isso sem reproduzir o motor e reescrever o banco do zero.

## Operating Context

- PWA instalável (manifest + service worker), rodando em iOS, Android e PC com prioridade igual entre
  as três frentes — nenhuma decisão de design pode favorecer uma plataforma às custas de outra.
- Estudo ocorre em sessões curtas e frequentes (Quiz, Cards, Resumos), sempre a partir de um HUB com
  meta do dia e índice em acordeão por área temática.
- Fluxo comercial roda por fora do produto (Pix / link de cartão via WhatsApp) — sem checkout in-app.
- Banco de questões é público por arquitetura (`data.js` carrega antes do login); a assinatura paga o
  serviço (motor adaptativo, acompanhamento, suporte), não o acesso ao conteúdo bruto.

## Capabilities and Constraints

- Núcleo em HTML/CSS/JS puro (sem framework), Firebase Auth + Realtime Database, GitHub Pages.
- `navTo` é síncrono por design — qualquer proposta de transição assíncrona (View Transitions API) é
  incompatível com a arquitetura atual e deve ser tratada como fora de escopo, não implementada.
- Regras do Realtime Database são o perímetro de segurança real (não o `isAdmin()` do cliente).
- IA generativa foi avaliada e descontinuada no produto — não reabrir sem pedido explícito do dono.
- "Virar app" significa PWA, nunca app nativo — cobrança e distribuição continuam fora da loja.

## Brand Commitments

Marca **Bomrillaz** (mascote César, paleta e tipografia próprias). Padrão de marca transversal
documentado em `Documents\Claude\vault\30-marca\BOMRILLAZ_DESIGN.md` — o CTSP é a origem desse padrão;
mudança de paleta/tipografia/token de botão deve reconciliar com esse documento, não decidir isolada
por projeto.

## Evidence on Hand

A plataforma já tem assinantes pagantes reais (sem identificação nominal aqui — dado pessoal). Serve
como evidência de tração para trabalho futuro de persuasão (landing, paywall), sem detalhar quem são.
Conteúdo do banco (questões/flashcards/resumos) é autoral, escrito do zero — nunca reproduzir prova
oficial nem prometer que a plataforma "sabe o que vai cair" ou garante aprovação.

## Product Principles

- Honestidade acima de conversão: nunca prometer aprovação, nunca fingir prever a prova.
- As três plataformas (iOS/Android/PC) têm prioridade igual — nenhuma decisão de design escolhe uma
  às custas de outra.
- Comportar-se como app nativo sem excluir quem usa só o navegador — instalar é conveniência, nunca
  requisito.
- O motor adaptativo (FSRS/BKT) é a fonte única de priorização de estudo — design nunca contorna isso
  com atalho de UI que ignore o que o motor decidiu.
- **Embasamento científico é critério de projeto, não preferência.** Tudo que for possível — metodologia
  de estudo, estrutura de tela, copy, decisão de produto — é norteado por pesquisa aplicável; fugir
  disso é a exceção e precisa de justificativa explícita. Proposta de mecanismo de estudo sem base
  citada é proposta incompleta: ou se diz em que evidência se apoia, ou se declara que é escolha de
  produto sem respaldo. Três qualificadores obrigatórios: não ficar preso a uma única metodologia (o
  alvo é um mix das melhores), evoluir sempre que possível, e revalidar a evidência ao voltar numa
  área já embasada em vez de repetir a citação de memória. Isso não afrouxa a honestidade — nunca
  prometer aprovação nem fingir prever a prova.

## Accessibility & Inclusion

Melhor esforço, sem meta formal (ex.: WCAG) declarada. Acessibilidade por teclado está incompleta em
alguns pontos (backlog conhecido) — corrigir quando aparecer no escopo do trabalho, não é bloqueante.
