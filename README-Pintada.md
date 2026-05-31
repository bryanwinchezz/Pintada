# 🎨 Pintada

**Pintada** é uma rede social completa desenvolvida em JavaScript, com suporte a PWA, perfil de usuário, feed de posts, exploração de conteúdo, mensagens, notificações, jogos e muito mais — uma das aplicações mais ambiciosas do portfólio.

## 📋 Sobre o Projeto

O **Pintada** é uma rede social web completa com identidade visual própria. O projeto conta com autenticação, feed principal, exploração de publicações, perfis de usuário, sistema de mensagens, notificações, molduras personalizadas, painel de configurações e até uma seção de jogos. Também suporta PWA para instalação como app nativo.

## 🖥️ Tecnologias Utilizadas

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

- **JavaScript** — lógica principal, service worker, interatividade
- **HTML5** — estrutura de todas as páginas
- **CSS3** — estilização e layout responsivo
- **PWA** — manifesto + service worker para instalação

## 📁 Estrutura do Projeto

```
Pintada/
├── index.html              # Feed principal
├── auth.html               # Login / Cadastro
├── explore.html            # Explorar publicações
├── profile.html            # Perfil do usuário
├── post.html               # Visualização de post
├── messages.html           # Mensagens diretas
├── notifications.html      # Notificações
├── games.html              # Seção de jogos
├── settings.html           # Configurações da conta
├── style.css               # Estilos globais
├── manifest.json           # Manifesto PWA
├── sw.js                   # Service Worker (PWA/offline)
├── pintada.png             # Logo da plataforma
├── pintada_ico.png         # Ícone da plataforma
├── molduras/               # Molduras para foto de perfil
└── js/                     # Scripts JavaScript
```

## ✨ Funcionalidades

- **Autenticação** — login e cadastro de usuários
- **Feed** — publicações dos usuários que você segue
- **Explorar** — descoberta de novos conteúdos e perfis
- **Perfil** — página de usuário com suas publicações
- **Mensagens** — sistema de chat direto entre usuários
- **Notificações** — alertas de curtidas, comentários e seguidores
- **Molduras** — personalização da foto de perfil
- **Jogos** — seção de jogos integrada à rede social
- **Configurações** — gerenciamento de conta e privacidade
- **PWA** — instalável como app no celular e desktop

## 🚀 Como Executar

```bash
# Clone o repositório
git clone https://github.com/bryanwinchezz/Pintada.git

# Abra no navegador
open index.html
```

Para testar o PWA corretamente, use um servidor local:

```bash
# Com Python
python3 -m http.server 8000

# Acesse em
http://localhost:8000
```

## 📱 PWA — Progressive Web App

O Pintada suporta instalação como PWA com service worker ativo, permitindo funcionamento offline parcial e instalação direta na tela inicial do dispositivo.

## 👨‍💻 Autor

**bryanwinchezz (Kauan Bryan)**

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/bryanwinchezz)
[![LinkedIn](https://img.shields.io/static/v1?message=LinkedIn&logo=linkedin&label=&color=0077B5&logoColor=white&labelColor=&style=for-the-badge)](https://www.linkedin.com/in/kauan-bryan-silveira-silva-416102350)
[![YouTube](https://img.shields.io/static/v1?message=YouTube&logo=youtube&label=&color=FF0000&logoColor=white&labelColor=&style=for-the-badge)](https://www.youtube.com/@bryanwinchez)

---

> Pintada — onde cada publicação é uma obra de arte.
