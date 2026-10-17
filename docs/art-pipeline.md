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

### Como usar no jogo

- Coloque os PNGs gerados (aprovados) na estrutura acima.
- Use `className="pixelated"` e escalas inteiras.
- Para strips de animação (4 frames), use CSS `background-position` + `steps()` ou recorte em frames individuais.

### Ícones e tiles simples

Continuam podendo ser feitos manualmente (Aseprite) ou mantidos os existentes da skill antiga até serem substituídos.

## Status

- Skill `pixel-assets` removida.
- Set inicial de herói (m/f), skills principais, mobs e boss Kernel Panic **aprovado** e pronto para integração.
- Próximo: subir os PNGs finais e ajustar referências no front.
