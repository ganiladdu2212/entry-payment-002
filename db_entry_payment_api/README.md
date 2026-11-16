# Entry Payment API

Spring Boot API for the Entry Payment gym management platform.

## MySQL team testing on this machine

The running API now uses the dedicated `entry_payment_002` MySQL schema.
Start it with `./start-mysql.ps1` (port 8090), which loads DB credentials from
the ignored `.env` file and explicitly selects the `mysql` profile.
The plain Maven command below still selects H2 by default.

For a fresh database, run `database/create-entry-payment-002.sql`, then start
the API to create the nine tables from the current entity definitions. The
photo and payment screenshot columns use LONGTEXT for the accepted upload sizes.
`database/seed-team-test.sql` supplies the original synthetic demo management
accounts; this script is for test environments only.

The repeatable HTTP smoke check is `./scripts/smoke-mysql.ps1 -BaseUrl
'http://localhost:8090/api/v1'`. Use `-VerifyOnly` after a restart to confirm the
saved test records survive. The check retains one clearly labeled QA member,
two sample payments, and a prepared WhatsApp audit record; it sends no messages.

Public deployment is not verified: business API endpoints currently allow
unauthenticated access and the app uses development OTPs. Use only synthetic
data until server-side authorization, real authentication and HTTPS are configured.

## Included foundation

- Spring Web MVC, Validation, Security, JPA, and Actuator
- H2 in-memory database for the active `local` profile; MySQL configuration retained for deployment
- public health checks at `/api/v1/health` and `/actuator/health`
- business endpoints currently permit unauthenticated requests (public deployment requires hardening)
- CORS configuration for the Expo web app
- management login endpoints under `/api/v1/management/auth`
- Swagger UI at `http://localhost:8090/swagger-ui.html`

## Run locally

No global Maven installation is required.

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-20' # this computer; any JDK 17+ is supported
.\mvnw.cmd spring-boot:run
```

The API starts at `http://localhost:8090` using the internal H2 database by default. The local profile seeds the Mahesh account (`9876501003`, OTP `4271`) for manual testing.

To use MySQL later, provide the variables in `.env.example` and start with `SPRING_PROFILES_ACTIVE=mysql`.

## Management table

For MySQL, run [`database/management.sql`](database/management.sql) once to create the `management` table and a Mahesh OTP-login record. The application will also create/update the table on startup.

- `created_date` is always assigned by the API in `Asia/Kolkata` (IST).
- Leave `pwd` null or blank to allow configured OTP login.
- When password settings are added, `pwd` must contain a BCrypt hash. A nonblank `pwd` disables OTP login for that management record.

The current Windows user-level `JAVA_HOME` points to JDK 11, so set it to JDK 17 or newer in each terminal (as above), or update the user environment variable before running Maven.
