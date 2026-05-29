# Voluntariados

Sistema simples de mensagens para voluntários e organizações, com dados armazenados no Firebase Firestore.

## O que foi adicionado

- `messages.html` agora usa Firebase Firestore para guardar conversas e mensagens.
- `js/firebase-init.js` inicializa o Firebase com as configurações existentes do projeto.
- `js/messages.js` foi atualizado para enviar/ler mensagens de Firestore, mantendo fallback localStorage.
- `.gitignore` criado para evitar arquivos de editor e logs.

## Como usar

1. Abra o projeto num servidor local (por exemplo, VS Code Live Server) ou publique no GitHub Pages.
2. Acesse `messages.html` após iniciar sessão.
3. O sistema armazena conversas no Firestore usando o projeto `plataforma-de-voluntariados`.

## Firebase

Se quiser usar outro projeto Firebase, substitua as configurações em `js/firebase-init.js`.

## GitHub

O repositório já tem uma origem remota configurada em GitHub:

- `https://github.com/danielalvelos1/Voluntariados.git`

Para enviar as alterações:

```bash
cd "c:\Users\Aluno\Desktop\Daniel_PAP_PGI24"
git add .
git commit -m "Integrar mensagens ao Firebase e preparar repositório GitHub"
git push origin master
```
