# Getting Started

Welcome to your new CAP project.

It contains these folders and files, following our recommended project layout:

File or Folder | Purpose
---------|----------
`app/` | content for UI frontends goes here
`db/` | your domain models and data go here
`srv/` | your service models and code go here
`readme.md` | this getting started guide

## Next Steps

- Open a new terminal and run `cds watch`
- (in VS Code simply choose _**Terminal** > Run Task > cds watch_)
- Start with your domain model, in a CDS file in `db/`

## Connecting to Supabase PostgreSQL locally

Create a `.env` file in the project root with your database credentials:

```dotenv
cds_requires_db_credentials_host=YOUR-SUPABASE-HOST
cds_requires_db_credentials_port=5432
cds_requires_db_credentials_database=postgres
cds_requires_db_credentials_user=postgres
cds_requires_db_credentials_password=YOUR-PASSWORD
```

Keep this file private; it is excluded from Git. For a Supabase session pooler,
use the host, port, and username shown in the Supabase connection dialog.
The local `postgres` profile allows up to 30 seconds to acquire a connection,
instead of the adapter's one-second default, to accommodate cloud latency.

Run `npm run deploy:pg` to deploy the CDS schema, then `npm run start:pg`
to start the backend. Deployment changes the target database schema and does
not migrate existing SQLite data.

These scripts use the local `postgres` profile, which loads `.env`. CAP 10
does not load `.env` under the `production` profile; a deployed production
application must receive credentials through environment variables or service
bindings instead. Plain `npm start` continues to use SQLite.

The current PostgreSQL SSL configuration disables certificate verification.
Configure trusted CA verification before using it for a production deployment.

## Learn More

Learn more at <https://cap.cloud.sap>.
