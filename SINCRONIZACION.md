# Sincronizar PasaLista entre móvil y ordenador

Esta guía deja la app en internet (GitHub Pages) y conecta una cuenta gratuita de Supabase.
Tiempo aproximado: 20 minutos. Solo se hace una vez.

## 1. Publicar la app con GitHub Pages
1. En tu repositorio `pasalista` de GitHub: **Settings → Pages**.
2. En *Build and deployment*: **Source = Deploy from a branch**, **Branch = main**, carpeta **/ (root)** → **Save**.
3. Espera 1–2 minutos. Tu app estará en **https://pol39.github.io/pasalista/**

## 2. Crear el proyecto en Supabase
1. Entra en https://supabase.com con «Sign in with GitHub».
2. **New project** → nombre `pasalista`, una contraseña de base de datos (guárdala) y
   **Region: Central EU (Frankfurt)** (los datos de menores se quedan en la UE).
3. Espera a que termine de crearse (1–2 minutos).

## 3. Crear la estructura de datos
1. En Supabase: **SQL Editor → New query**.
2. Pega todo el contenido del archivo `supabase/esquema.sql` y pulsa **Run**. Debe decir *Success*.

## 4. Permitir entrar con correo y contraseña
1. **Authentication → Sign In / Providers → Email** (el menú puede llamarse un poco distinto).
2. Desactiva **Confirm email** y guarda. (Así creas la cuenta y entras al momento, sin esperar un correo.)

## 5. Indicar la dirección de la app
1. **Authentication → URL Configuration**.
2. **Site URL**: `https://pol39.github.io/pasalista/`
3. En **Redirect URLs** añade: `https://pol39.github.io/pasalista/**`
   (sirve para el correo de «He olvidado la contraseña»).

## 6. Conectar la app con tu proyecto
1. **Project Settings → API** (o *Data API*). Copia:
   - **Project URL** (tipo `https://xxxx.supabase.co`)
   - la clave **anon public** — **NO** la `service_role`.
2. En tu proyecto abre `js/config.js`, pega los dos valores entre las comillas y guarda.
3. Súbelo: `git add . && git commit -m "Conectar Supabase" && git push`

## 7. Probar
1. Abre la app en **https://pol39.github.io/pasalista/** y pulsa el icono ☁️ de la cabecera → **Crear cuenta**.
2. Abre la misma dirección en el móvil, entra con el mismo correo y verás los mismos datos.
   Los cambios de un dispositivo aparecen en el otro en unos segundos.

## Cosas importantes
- **Datos de prueba:** la web de Pages y el Codespace son «sitios» distintos, cada uno con sus propios datos locales.
  Al entrar con tu cuenta, la app pregunta si quieres *combinar* o *usar solo los de la nube*.
  Para vaciar la nube y empezar limpio: Supabase → SQL Editor → `delete from public.docs;`
- **Cerrar el registro:** cuando hayáis creado las cuentas, puedes desactivar *Allow new users to sign up*
  (Authentication → Sign In / Providers) para que nadie más pueda crear una.
- **Proyecto gratuito:** hasta donde sé, Supabase pausa los proyectos gratuitos tras un tiempo sin actividad
  y el plan gratuito no incluye copias de seguridad. Compruébalo en tu panel. La copia JSON (Fase 3) servirá de seguro.
- **Privacidad (RGPD):** son datos de menores. Guarda solo nombre e inicial del apellido, pide el consentimiento de
  las familias y no compartas la clave `service_role`.
