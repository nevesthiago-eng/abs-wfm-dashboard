# ABS WFM Dashboard

Dashboard operacional que consome dados do Google Sheets via OAuth2.

## Arquivos

| Arquivo | Descrição |
|---|---|
| `index.html` | Dashboard completo (KPIs, gráficos, tabela) |
| `servir_local.bat` | Atalho para testar localmente |

## Como Testar Localmente

1. Dê dois cliques em `servir_local.bat`
2. Abra o navegador em: `http://localhost:5500`
3. Clique em "Entrar com Google"
4. Autorize o acesso à planilha
5. Pronto! O dashboard carrega automaticamente

## Como Publicar no GitHub Pages

### 1. Criar repositório no GitHub

1. Acesse https://github.com/new
2. Nome do repositório: `abs-wfm-dashboard`
3. Deixe público
4. Clique em "Create repository"

### 2. Fazer upload do dashboard

```bash
git clone https://github.com/nevesthiago-eng/abs-wfm-dashboard.git
cd abs-wfm-dashboard
copy "\\fs\Atendimento\Documentos\ControlDesk\WFM\ABS\Final_Tratado\2026\07\dashboard.html" index.html
git add index.html
git commit -m "Adiciona dashboard WFM"
git push
```

**Ou** diretamente pelo site:
1. Abra o repositório no GitHub
2. Clique em "Add file" → "Upload files"
3. Arraste o `index.html`
4. "Commit changes"

### 3. Ativar GitHub Pages

1. No repositório, vá em **Settings** → **Pages**
2. Em "Branch": selecione `main` e pasta `/ (root)`
3. Clique em "Save"
4. Aguarde 1-2 minutos
5. ✅ URL: `https://nevesthiago-eng.github.io/abs-wfm-dashboard`

### 4. Liberar URL no Google Cloud

1. Acesse https://console.cloud.google.com
2. Projeto: **ABS WFM Dashboard**
3. Menu → **APIs & Services** → **Credentials**
4. Clique no **ID do cliente OAuth** que você criou
5. Em "Origens JavaScript autorizadas" → **Add URI**
6. Adicione: `https://nevesthiago-eng.github.io`
7. Clique em "Save"

### 5. Distribuir o link

Envie para a operação:
```
https://nevesthiago-eng.github.io/abs-wfm-dashboard
```

## Como Atualizar o Dashboard

Se precisar alterar algo no HTML:

1. Edite o arquivo localmente
2. Salve na rede (backup)
3. Suba a nova versão no GitHub Pages

## Estrutura de Dados Esperada

O dashboard lê a aba **"Base"** da planilha **"ABS WFM {mês}-{ano}"**.
As colunas esperadas são:

- Nome do agente
- UG
- Tipo (FALTA / ATRASO / Regular / Adiantado)
- Horário Escalado / Real
- Diferença
- Tipo Saída
- (entre outras)

Se a estrutura da planilha mudar, o dashboard se adapta automaticamente.
