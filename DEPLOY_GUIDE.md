# Deploy Company & Contacts Features

## Step 1: Run Database Migrations

Connect to your PostgreSQL database and run:

```bash
psql <your-connection-string> -f database/migrations/002_add_contact_fields.sql
psql <your-connection-string> -f database/migrations/003_link_members_to_legal_entities.sql
```

Or use Azure Data Studio / pgAdmin to run the SQL scripts.

## Step 2: Deploy API Functions

```bash
cd api
npm run build
func azure functionapp publish <your-function-app-name>
```

## Step 3: Test

Open the web app and click on a member. You should now see:
- Company tab with address fields
- Contacts tab with contact management

## API Endpoints Created

- `GET /api/v1/legal-entities/{id}` - Get company details
- `PUT /api/v1/legal-entities/{id}` - Update company
- `GET /api/v1/legal-entities/{id}/contacts` - Get contacts
- `POST /api/v1/contacts` - Create contact  
- `PUT /api/v1/contacts/{id}` - Update contact
- `DELETE /api/v1/contacts/{id}` - Delete contact
