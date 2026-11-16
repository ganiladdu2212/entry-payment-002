# Entry Payment UI

Universal React Native application for Android, iOS, and web, built with Expo and TypeScript.

## Start locally

```powershell
npm install
npm start
```

From the Expo terminal, press `a` for Android or `w` for web. iOS Simulator requires macOS; a physical iPhone can use an Expo development build.

The API defaults to `http://localhost:8090/api/v1` (`10.0.2.2` on the Android emulator). Copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_API_URL` when using another host, especially a physical phone.

## Checks

```powershell
npm run typecheck
npm run build:web
```
