<div align="center">
  
# VoidZoneClient

[![Status](https://img.shields.io/badge/Status-Ativo-success?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)]()
[![WebRTC](https://img.shields.io/badge/WebRTC-PeerJS-E50914?style=for-the-badge&logo=webrtc)]()

</div>

## 📌 Sobre o Projeto

O **VoidZone** é uma aplicação web focada em transmissão de tela com baixíssima latência (telagem) utilizando a tecnologia WebRTC via rede Peer-to-Peer (P2P). O objetivo é conectar usuários instantaneamente, sem necessidade de instalar aplicativos de terceiros, criar contas ou depender de servidores intermediários pesados. 

Tudo acontece de máquina para máquina, direto do navegador.

## 🚀 Funcionalidades

- **Conexão Direta (P2P):** Sem servidores centrais processando o vídeo, garantindo mais privacidade e menor atraso.
- **Resolução e FPS Adaptáveis:** Ajuste de qualidade (720p, 1080p, 1440p) e taxa de quadros (30 a 90 FPS) em tempo real.
- **Fura-Firewall Integrado:** Utiliza servidores STUN públicos do Google para contornar bloqueios de operadoras (CGNAT) e garantir que os PCs se enxerguem.
- **Modo Espectador Mobile:** Assista às transmissões perfeitamente do seu celular (Android/iOS) em modo paisagem, de onde estiver.
- **Zero Setup:** Basta gerar o link da sala e compartilhar.

## 🛠️ Tecnologias Utilizadas

O projeto foi construído utilizando tecnologias puras do ecossistema web, garantindo leveza e compatibilidade:

<div style="display: flex; gap: 10px;">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/PeerJS-333333?style=for-the-badge&logo=webrtc&logoColor=white" alt="PeerJS">
</div>

## 📱 Limitações Conhecidas (Mobile)

Devido às políticas de segurança restritas da Apple (iOS/Safari) e do Google (Android/Chrome), **navegadores em dispositivos móveis não possuem permissão nativa para capturar e transmitir a tela** via web (`getDisplayMedia`). 

* **No PC (Windows, Mac, Linux):** Transmissão e visualização liberadas.
* **No Celular (Mobile):** Funciona exclusivamente como **espectador** (Você pode entrar na sala e assistir a quem está transmitindo no PC).

## ⚙️ Como usar

Como o projeto é feito em HTML/CSS/JS puro (Vanilla), não há necessidade de build ou de rodar o `npm install`.

1. Clone o repositório:
```bash
git clone [https://github.com/GuilhermeKaw/voidzone-telagens.git](https://github.com/GuilhermeKaw/voidzone-telagens.git)
