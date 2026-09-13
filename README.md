# QuizMaster

Quiz en temps reel avec rooms, buzzer, admin et scores.

## Lancer en local

Dans deux terminaux :

```powershell
npm.cmd install
npm.cmd run server
```

Puis :

```powershell
npm.cmd run dev
```

Ouvre http://localhost:5173.

## Production

```powershell
npm.cmd run build
npm.cmd start
```

Le serveur est disponible sur http://localhost:3001.

Pour deployer sur Render :

```text
Build Command: npm install && npm run build
Start Command: npm start
```
