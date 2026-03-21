# 🏗️ Arquitetura Técnica --- Sistema Clínica Estética

## 🎯 Princípios

-   Simples no MVP
-   Multi-tenant desde o início
-   Serverless-first
-   Segurança por padrão
-   TypeScript end-to-end

------------------------------------------------------------------------

## 🧱 Stack

### Frontend

-   Next.js (React)
-   TypeScript
-   TailwindCSS + shadcn/ui
-   React Hook Form + Zod
-   TanStack Query
-   Zustand

### Backend

-   Supabase (Postgres + Auth + Realtime)

### Functions

-   Supabase Edge Functions

### Storage

-   Cloudflare R2

### Infra

-   Vercel (frontend)
-   Cloudflare (CDN)

------------------------------------------------------------------------

## 🧠 Arquitetura Geral

Frontend → Supabase → Postgres → Edge Functions → R2

Realtime via Supabase WebSockets

------------------------------------------------------------------------

## 🧩 Multi-Tenant

Todas tabelas com: - tenant_id

Segurança via Row Level Security (RLS)

------------------------------------------------------------------------

## 🗄️ Modelagem Base

-   tenants
-   users
-   clients
-   appointments
-   anamnesis
-   evolutions
-   procedures
-   budgets
-   sessions
-   stock
-   documents
-   photos

------------------------------------------------------------------------

## 🔐 Segurança

-   Supabase Auth
-   RLS em todas tabelas
-   URLs assinadas no R2
-   Assinatura digital (canvas + metadata)

------------------------------------------------------------------------

## 📦 Storage (R2)

tenant_id/clients/client_id/ - photos - documents - signatures

------------------------------------------------------------------------

## 🔄 Realtime

Uso: - Atualização de agenda - Status de sessões

------------------------------------------------------------------------

## 📅 Google Agenda

-   Integração via OAuth2
-   Criação automática de eventos

------------------------------------------------------------------------

## 🧠 Face Mapping

-   React Konva
-   Canvas interativo
-   Marcação de pontos no rosto

------------------------------------------------------------------------

## 📸 Foto + Overlay

-   Upload de imagem
-   Sobreposição com marcações

------------------------------------------------------------------------

## 🧾 Documentos

-   PDF generation
-   Assinatura digital
-   Armazenamento no R2

------------------------------------------------------------------------

## ⚙️ Edge Functions

-   Signed URLs
-   Integração Google
-   Geração de PDF

------------------------------------------------------------------------

## 🚀 Deploy

-   Vercel (frontend)
-   Supabase (backend)
-   Cloudflare R2 (storage)

------------------------------------------------------------------------

## 🔮 Evoluções

-   RBAC
-   Financeiro completo
-   Automação WhatsApp
-   IA para protocolos

------------------------------------------------------------------------

## ⚠️ Pontos críticos

-   Multi-tenant correto
-   Segurança de dados
-   Performance do canvas
