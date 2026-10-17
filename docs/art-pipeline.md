# Pipeline de Arte — DevServer

## Novo fluxo (a partir de 2026-10-16)

A skill `pixel-assets` foi **removida**. Os assets de alta fidelidade (herói, skills, bosses, mobs) são gerados via **Grok Imagine** no estilo dos key arts e organizados como PNGs em:

```
web/public/art/generated/
├── hero/
│   ├── male/
│   │   ├── idle.png
│   │   ├── walk.png
│   │   ├── run.png
│   │   ├── jump.png
│   │   └── attack.png
│   └── female/
│       ├── idle.png
│       ├── walk.png
│       ├── run.png
│       └── attack.png
├── skills/
│   ├── furia-do-codigo.png
│   ├── tempestade-de-dados.png
│   ├── bencao-do-backup.png
│   ├── furto-de-banda.png
│   └── apocalipse-elemental.png
├── mobs/
│   ├── slime-roxo.png
│   ├── slime-verde.png
│   ├── mascote-github.png
│   ├── mascote-python.png
│   └── robo.png
└── boss/
    └── kernel-panic.png
```

### Status atual
- Skill removida.
- README e este documento atualizados.
- Set completo de referências **aprovado** e pronto para ser colocado nas pastas acima.
- As imagens geradas estão disponíveis na conversa do projeto para download e organização.

### Como finalizar a integração
1. Baixe as imagens aprovadas da conversa.
2. Renomeie e coloque em `web/public/art/generated/` seguindo a estrutura.
3. Commit e push.
4. Atualize as referências no front conforme necessário.

## Como usar no jogo
- Use `className="pixelated"` e escalas inteiras.
- Para strips de animação, use CSS sprite ou recorte os frames.
