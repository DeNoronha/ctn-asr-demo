                                                                   Table "public.members"
      Column      |            Type             | Collation | Nullable |           Default            | Storage  | Compression | Stats target | Description 
------------------+-----------------------------+-----------+----------+------------------------------+----------+-------------+--------------+-------------
 id               | uuid                        |           | not null | gen_random_uuid()            | plain    |             |              | 
 org_id           | character varying(100)      |           | not null |                              | extended |             |              | 
 legal_name       | character varying(255)      |           | not null |                              | extended |             |              | 
 lei              | character varying(20)       |           |          |                              | extended |             |              | 
 kvk              | character varying(20)       |           |          |                              | extended |             |              | 
 domain           | character varying(255)      |           | not null |                              | extended |             |              | 
 status           | character varying(20)       |           | not null | 'PENDING'::character varying | extended |             |              | 
 membership_level | character varying(20)       |           |          | 'BASIC'::character varying   | extended |             |              | 
 created_at       | timestamp without time zone |           |          | now()                        | plain    |             |              | 
 updated_at       | timestamp without time zone |           |          | now()                        | plain    |             |              | 
 metadata         | jsonb                       |           |          |                              | extended |             |              | 
 legal_entity_id  | uuid                        |           |          |                              | plain    |             |              | 
Indexes:
    "members_pkey" PRIMARY KEY, btree (id)
    "idx_members_domain" btree (domain)
    "idx_members_lei" btree (lei) WHERE lei IS NOT NULL
    "idx_members_org_id" btree (org_id)
    "idx_members_status" btree (status)
    "members_org_id_key" UNIQUE CONSTRAINT, btree (org_id)
Foreign-key constraints:
    "members_legal_entity_id_fkey" FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(legal_entity_id)
Referenced by:
    TABLE "issued_tokens" CONSTRAINT "issued_tokens_member_id_fkey" FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    TABLE "oauth_clients" CONSTRAINT "oauth_clients_member_id_fkey" FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    TABLE "vetting_records" CONSTRAINT "vetting_records_member_id_fkey" FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
Access method: heap

                                                                      Table "public.legal_entity"
             Column              |           Type           | Collation | Nullable |           Default            | Storage  | Compression | Stats target | Description 
---------------------------------+--------------------------+-----------+----------+------------------------------+----------+-------------+--------------+-------------
 legal_entity_id                 | uuid                     |           | not null | gen_random_uuid()            | plain    |             |              | 
 party_id                        | uuid                     |           | not null |                              | plain    |             |              | 
 dt_created                      | timestamp with time zone |           |          | now()                        | plain    |             |              | 
 dt_modified                     | timestamp with time zone |           |          | now()                        | plain    |             |              | 
 created_by                      | character varying(100)   |           |          |                              | extended |             |              | 
 modified_by                     | character varying(100)   |           |          |                              | extended |             |              | 
 is_deleted                      | boolean                  |           |          | false                        | plain    |             |              | 
 primary_legal_name              | character varying(255)   |           | not null |                              | extended |             |              | 
 address_line1                   | character varying(255)   |           |          |                              | extended |             |              | 
 address_line2                   | character varying(255)   |           |          |                              | extended |             |              | 
 postal_code                     | character varying(255)   |           |          |                              | extended |             |              | 
 city                            | character varying(255)   |           |          |                              | extended |             |              | 
 province                        | character varying(255)   |           |          |                              | extended |             |              | 
 country_code                    | character varying(2)     |           |          |                              | extended |             |              | 
 entity_legal_form               | character varying(255)   |           |          |                              | extended |             |              | 
 registered_at                   | character varying(255)   |           |          |                              | extended |             |              | 
 direct_parent_legal_entity_id   | uuid                     |           |          |                              | plain    |             |              | 
 ultimate_parent_legal_entity_id | uuid                     |           |          |                              | plain    |             |              | 
 domain                          | character varying(255)   |           |          |                              | extended |             |              | 
 status                          | character varying(20)    |           |          | 'PENDING'::character varying | extended |             |              | 
 membership_level                | character varying(20)    |           |          | 'BASIC'::character varying   | extended |             |              | 
 metadata                        | jsonb                    |           |          |                              | extended |             |              | 
Indexes:
    "legal_entity_pkey" PRIMARY KEY, btree (legal_entity_id)
    "idx_legal_entity_created" btree (dt_created)
    "idx_legal_entity_deleted" btree (is_deleted) WHERE is_deleted = false
    "idx_legal_entity_name" btree (primary_legal_name)
    "idx_legal_entity_party" btree (party_id)
    "idx_legal_entity_status" btree (status)
Foreign-key constraints:
    "fk_direct_parent" FOREIGN KEY (direct_parent_legal_entity_id) REFERENCES legal_entity(legal_entity_id)
    "fk_party" FOREIGN KEY (party_id) REFERENCES party_reference(party_id) ON DELETE CASCADE
    "fk_ultimate_parent" FOREIGN KEY (ultimate_parent_legal_entity_id) REFERENCES legal_entity(legal_entity_id)
Referenced by:
    TABLE "legal_entity" CONSTRAINT "fk_direct_parent" FOREIGN KEY (direct_parent_legal_entity_id) REFERENCES legal_entity(legal_entity_id)
    TABLE "legal_entity_number" CONSTRAINT "fk_legal_entity" FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE
    TABLE "legal_entity_contact" CONSTRAINT "fk_legal_entity_contact" FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE
    TABLE "legal_entity_endpoint" CONSTRAINT "fk_legal_entity_endpoint" FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE
    TABLE "legal_entity" CONSTRAINT "fk_ultimate_parent" FOREIGN KEY (ultimate_parent_legal_entity_id) REFERENCES legal_entity(legal_entity_id)
    TABLE "members" CONSTRAINT "members_legal_entity_id_fkey" FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(legal_entity_id)
Triggers:
    trg_legal_entity_modified BEFORE UPDATE ON legal_entity FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp()
Access method: heap

                                                              Table "public.legal_entity_contact"
          Column          |           Type           | Collation | Nullable |          Default           | Storage  | Compression | Stats target | Description 
--------------------------+--------------------------+-----------+----------+----------------------------+----------+-------------+--------------+-------------
 legal_entity_contact_id  | uuid                     |           | not null | gen_random_uuid()          | plain    |             |              | 
 legal_entity_id          | uuid                     |           | not null |                            | plain    |             |              | 
 dt_created               | timestamp with time zone |           |          | now()                      | plain    |             |              | 
 dt_modified              | timestamp with time zone |           |          | now()                      | plain    |             |              | 
 created_by               | character varying(100)   |           |          |                            | extended |             |              | 
 modified_by              | character varying(100)   |           |          |                            | extended |             |              | 
 is_deleted               | boolean                  |           |          | false                      | plain    |             |              | 
 contact_type             | character varying(50)    |           | not null |                            | extended |             |              | 
 full_name                | character varying(255)   |           | not null |                            | extended |             |              | 
 email                    | character varying(255)   |           | not null |                            | extended |             |              | 
 phone                    | character varying(50)    |           |          |                            | extended |             |              | 
 mobile                   | character varying(50)    |           |          |                            | extended |             |              | 
 job_title                | character varying(100)   |           |          |                            | extended |             |              | 
 department               | character varying(100)   |           |          |                            | extended |             |              | 
 preferred_language       | character varying(10)    |           |          | 'en'::character varying    | extended |             |              | 
 preferred_contact_method | character varying(50)    |           |          | 'EMAIL'::character varying | extended |             |              | 
 is_primary               | boolean                  |           |          | false                      | plain    |             |              | 
 is_active                | boolean                  |           |          | true                       | plain    |             |              | 
 first_name               | character varying(100)   |           |          |                            | extended |             |              | 
 last_name                | character varying(100)   |           |          |                            | extended |             |              | 
Indexes:
    "legal_entity_contact_pkey" PRIMARY KEY, btree (legal_entity_contact_id)
    "idx_legal_entity_contact_active" btree (is_active) WHERE is_active = true
    "idx_legal_entity_contact_deleted" btree (is_deleted) WHERE is_deleted = false
    "idx_legal_entity_contact_email" btree (email)
    "idx_legal_entity_contact_entity" btree (legal_entity_id)
    "idx_legal_entity_contact_primary" btree (is_primary) WHERE is_primary = true
    "idx_legal_entity_contact_type" btree (contact_type)
Foreign-key constraints:
    "fk_legal_entity_contact" FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE
Triggers:
    trg_legal_entity_contact_modified BEFORE UPDATE ON legal_entity_contact FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp()
Access method: heap

                                                               Table "public.legal_entity_endpoint"
          Column          |           Type           | Collation | Nullable |            Default            | Storage  | Compression | Stats target | Description 
--------------------------+--------------------------+-----------+----------+-------------------------------+----------+-------------+--------------+-------------
 legal_entity_endpoint_id | uuid                     |           | not null | gen_random_uuid()             | plain    |             |              | 
 legal_entity_id          | uuid                     |           | not null |                               | plain    |             |              | 
 dt_created               | timestamp with time zone |           |          | now()                         | plain    |             |              | 
 dt_modified              | timestamp with time zone |           |          | now()                         | plain    |             |              | 
 created_by               | character varying(100)   |           |          |                               | extended |             |              | 
 modified_by              | character varying(100)   |           |          |                               | extended |             |              | 
 is_deleted               | boolean                  |           |          | false                         | plain    |             |              | 
 endpoint_name            | character varying(255)   |           | not null |                               | extended |             |              | 
 endpoint_url             | character varying(500)   |           |          |                               | extended |             |              | 
 endpoint_description     | text                     |           |          |                               | extended |             |              | 
 data_category            | character varying(100)   |           |          |                               | extended |             |              | 
 endpoint_type            | character varying(50)    |           |          | 'REST_API'::character varying | extended |             |              | 
 authentication_method    | character varying(50)    |           |          |                               | extended |             |              | 
 last_connection_test     | timestamp with time zone |           |          |                               | plain    |             |              | 
 last_connection_status   | character varying(50)    |           |          |                               | extended |             |              | 
 connection_test_details  | jsonb                    |           |          |                               | extended |             |              | 
 is_active                | boolean                  |           |          | true                          | plain    |             |              | 
 activation_date          | timestamp with time zone |           |          |                               | plain    |             |              | 
 deactivation_date        | timestamp with time zone |           |          |                               | plain    |             |              | 
 deactivation_reason      | text                     |           |          |                               | extended |             |              | 
Indexes:
    "legal_entity_endpoint_pkey" PRIMARY KEY, btree (legal_entity_endpoint_id)
    "idx_legal_entity_endpoint_active" btree (is_active) WHERE is_active = true
    "idx_legal_entity_endpoint_category" btree (data_category)
    "idx_legal_entity_endpoint_deleted" btree (is_deleted) WHERE is_deleted = false
    "idx_legal_entity_endpoint_entity" btree (legal_entity_id)
Foreign-key constraints:
    "fk_legal_entity_endpoint" FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE
Referenced by:
    TABLE "endpoint_authorization" CONSTRAINT "fk_endpoint_authorization" FOREIGN KEY (legal_entity_endpoint_id) REFERENCES legal_entity_endpoint(legal_entity_endpoint_id) ON DELETE CASCADE
Triggers:
    trg_legal_entity_endpoint_modified BEFORE UPDATE ON legal_entity_endpoint FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp()
Access method: heap

                                                                Table "public.legal_entity_number"
          Column           |           Type           | Collation | Nullable |           Default            | Storage  | Compression | Stats target | Description 
---------------------------+--------------------------+-----------+----------+------------------------------+----------+-------------+--------------+-------------
 legal_entity_reference_id | uuid                     |           | not null | gen_random_uuid()            | plain    |             |              | 
 legal_entity_id           | uuid                     |           | not null |                              | plain    |             |              | 
 dt_created                | timestamp with time zone |           |          | now()                        | plain    |             |              | 
 dt_modified               | timestamp with time zone |           |          | now()                        | plain    |             |              | 
 created_by                | character varying(100)   |           |          |                              | extended |             |              | 
 modified_by               | character varying(100)   |           |          |                              | extended |             |              | 
 is_deleted                | boolean                  |           |          | false                        | plain    |             |              | 
 identifier_type           | character varying(100)   |           | not null |                              | extended |             |              | 
 identifier_value          | character varying(100)   |           | not null |                              | extended |             |              | 
 country_code              | character varying(2)     |           |          |                              | extended |             |              | 
 valid_from                | timestamp with time zone |           |          |                              | plain    |             |              | 
 valid_to                  | timestamp with time zone |           |          |                              | plain    |             |              | 
 issued_by                 | character varying(100)   |           |          |                              | extended |             |              | 
 validated_by              | character varying(100)   |           |          |                              | extended |             |              | 
 validation_status         | character varying(50)    |           |          | 'PENDING'::character varying | extended |             |              | 
 validation_date           | timestamp with time zone |           |          |                              | plain    |             |              | 
 verification_document_url | text                     |           |          |                              | extended |             |              | 
 verification_notes        | text                     |           |          |                              | extended |             |              | 
Indexes:
    "legal_entity_number_pkey" PRIMARY KEY, btree (legal_entity_reference_id)
    "idx_legal_entity_number_deleted" btree (is_deleted) WHERE is_deleted = false
    "idx_legal_entity_number_entity" btree (legal_entity_id)
    "idx_legal_entity_number_status" btree (validation_status)
    "idx_legal_entity_number_type" btree (identifier_type)
    "idx_legal_entity_number_value" btree (identifier_value)
    "uq_identifier" UNIQUE CONSTRAINT, btree (legal_entity_id, identifier_type, identifier_value)
Foreign-key constraints:
    "fk_legal_entity" FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE
Triggers:
    trg_legal_entity_number_modified BEFORE UPDATE ON legal_entity_number FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp()
Access method: heap

                                                     Table "public.party_reference"
   Column    |           Type           | Collation | Nullable |      Default      | Storage  | Compression | Stats target | Description 
-------------+--------------------------+-----------+----------+-------------------+----------+-------------+--------------+-------------
 party_id    | uuid                     |           | not null | gen_random_uuid() | plain    |             |              | 
 dt_created  | timestamp with time zone |           |          | now()             | plain    |             |              | 
 dt_modified | timestamp with time zone |           |          | now()             | plain    |             |              | 
 created_by  | character varying(100)   |           |          |                   | extended |             |              | 
 modified_by | character varying(100)   |           |          |                   | extended |             |              | 
 is_deleted  | boolean                  |           |          | false             | plain    |             |              | 
 party_class | character varying(255)   |           |          |                   | extended |             |              | 
 party_type  | character varying(255)   |           |          |                   | extended |             |              | 
Indexes:
    "party_reference_pkey" PRIMARY KEY, btree (party_id)
    "idx_party_reference_created" btree (dt_created)
    "idx_party_reference_deleted" btree (is_deleted) WHERE is_deleted = false
Referenced by:
    TABLE "legal_entity" CONSTRAINT "fk_party" FOREIGN KEY (party_id) REFERENCES party_reference(party_id) ON DELETE CASCADE
Triggers:
    trg_party_reference_modified BEFORE UPDATE ON party_reference FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp()
Access method: heap

                                                             Table "public.endpoint_authorization"
          Column           |           Type           | Collation | Nullable |          Default          | Storage  | Compression | Stats target | Description 
---------------------------+--------------------------+-----------+----------+---------------------------+----------+-------------+--------------+-------------
 endpoint_authorization_id | uuid                     |           | not null | gen_random_uuid()         | plain    |             |              | 
 legal_entity_endpoint_id  | uuid                     |           | not null |                           | plain    |             |              | 
 dt_created                | timestamp with time zone |           |          | now()                     | plain    |             |              | 
 dt_modified               | timestamp with time zone |           |          | now()                     | plain    |             |              | 
 created_by                | character varying(100)   |           |          |                           | extended |             |              | 
 modified_by               | character varying(100)   |           |          |                           | extended |             |              | 
 is_deleted                | boolean                  |           |          | false                     | plain    |             |              | 
 token_value               | text                     |           | not null |                           | extended |             |              | 
 token_type                | character varying(50)    |           |          | 'BVAD'::character varying | extended |             |              | 
 token_hash                | character varying(255)   |           |          |                           | extended |             |              | 
 issued_at                 | timestamp with time zone |           |          | now()                     | plain    |             |              | 
 expires_at                | timestamp with time zone |           |          |                           | plain    |             |              | 
 revoked_at                | timestamp with time zone |           |          |                           | plain    |             |              | 
 revocation_reason         | text                     |           |          |                           | extended |             |              | 
 is_active                 | boolean                  |           |          | true                      | plain    |             |              | 
 last_used_at              | timestamp with time zone |           |          |                           | plain    |             |              | 
 usage_count               | integer                  |           |          | 0                         | plain    |             |              | 
 issued_by                 | character varying(100)   |           |          |                           | extended |             |              | 
 issued_by_user_id         | uuid                     |           |          |                           | plain    |             |              | 
Indexes:
    "endpoint_authorization_pkey" PRIMARY KEY, btree (endpoint_authorization_id)
    "idx_endpoint_authorization_active" btree (is_active) WHERE is_active = true
    "idx_endpoint_authorization_deleted" btree (is_deleted) WHERE is_deleted = false
    "idx_endpoint_authorization_endpoint" btree (legal_entity_endpoint_id)
    "idx_endpoint_authorization_expires" btree (expires_at)
Foreign-key constraints:
    "fk_endpoint_authorization" FOREIGN KEY (legal_entity_endpoint_id) REFERENCES legal_entity_endpoint(legal_entity_endpoint_id) ON DELETE CASCADE
Triggers:
    trg_endpoint_authorization_modified BEFORE UPDATE ON endpoint_authorization FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp()
Access method: heap

                                                  Table "public.issued_tokens"
   Column   |            Type             | Collation | Nullable | Default | Storage  | Compression | Stats target | Description 
------------+-----------------------------+-----------+----------+---------+----------+-------------+--------------+-------------
 jti        | character varying(255)      |           | not null |         | extended |             |              | 
 token_type | character varying(20)       |           | not null |         | extended |             |              | 
 member_id  | uuid                        |           |          |         | plain    |             |              | 
 issued_at  | timestamp without time zone |           |          | now()   | plain    |             |              | 
 expires_at | timestamp without time zone |           | not null |         | plain    |             |              | 
 revoked    | boolean                     |           |          | false   | plain    |             |              | 
 metadata   | jsonb                       |           |          |         | extended |             |              | 
Indexes:
    "issued_tokens_pkey" PRIMARY KEY, btree (jti)
    "idx_tokens_expiry" btree (expires_at)
    "idx_tokens_member" btree (member_id)
    "idx_tokens_type" btree (token_type)
Foreign-key constraints:
    "issued_tokens_member_id_fkey" FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
Access method: heap

                                                      Table "public.oauth_clients"
       Column       |            Type             | Collation | Nullable | Default | Storage  | Compression | Stats target | Description 
--------------------+-----------------------------+-----------+----------+---------+----------+-------------+--------------+-------------
 client_id          | character varying(255)      |           | not null |         | extended |             |              | 
 member_id          | uuid                        |           |          |         | plain    |             |              | 
 client_secret_hash | character varying(255)      |           | not null |         | extended |             |              | 
 redirect_uris      | text[]                      |           |          |         | extended |             |              | 
 scopes             | text[]                      |           |          |         | extended |             |              | 
 created_at         | timestamp without time zone |           |          | now()   | plain    |             |              | 
 updated_at         | timestamp without time zone |           |          | now()   | plain    |             |              | 
Indexes:
    "oauth_clients_pkey" PRIMARY KEY, btree (client_id)
    "idx_oauth_member" btree (member_id)
Foreign-key constraints:
    "oauth_clients_member_id_fkey" FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
Access method: heap

                                                                     Table "public.audit_logs"
    Column     |            Type             | Collation | Nullable |                Default                 | Storage  | Compression | Stats target | Description 
---------------+-----------------------------+-----------+----------+----------------------------------------+----------+-------------+--------------+-------------
 id            | bigint                      |           | not null | nextval('audit_logs_id_seq'::regclass) | plain    |             |              | 
 event_time    | timestamp without time zone |           |          | now()                                  | plain    |             |              | 
 event_type    | character varying(50)       |           | not null |                                        | extended |             |              | 
 actor_org_id  | character varying(100)      |           |          |                                        | extended |             |              | 
 resource_type | character varying(50)       |           |          |                                        | extended |             |              | 
 resource_id   | character varying(255)      |           |          |                                        | extended |             |              | 
 action        | character varying(50)       |           |          |                                        | extended |             |              | 
 result        | character varying(20)       |           |          |                                        | extended |             |              | 
 metadata      | jsonb                       |           |          |                                        | extended |             |              | 
Indexes:
    "audit_logs_pkey" PRIMARY KEY, btree (id)
    "idx_audit_actor" btree (actor_org_id)
    "idx_audit_time" btree (event_time DESC)
    "idx_audit_type" btree (event_type)
Access method: heap

                                                       Table "public.vetting_records"
    Column    |            Type             | Collation | Nullable |      Default      | Storage  | Compression | Stats target | Description 
--------------+-----------------------------+-----------+----------+-------------------+----------+-------------+--------------+-------------
 id           | uuid                        |           | not null | gen_random_uuid() | plain    |             |              | 
 member_id    | uuid                        |           |          |                   | plain    |             |              | 
 vetting_type | character varying(50)       |           | not null |                   | extended |             |              | 
 status       | character varying(20)       |           | not null |                   | extended |             |              | 
 result       | jsonb                       |           |          |                   | extended |             |              | 
 completed_at | timestamp without time zone |           |          |                   | plain    |             |              | 
 expires_at   | timestamp without time zone |           |          |                   | plain    |             |              | 
 created_at   | timestamp without time zone |           |          | now()             | plain    |             |              | 
Indexes:
    "vetting_records_pkey" PRIMARY KEY, btree (id)
    "idx_vetting_member" btree (member_id)
    "idx_vetting_status" btree (status)
Foreign-key constraints:
    "vetting_records_member_id_fkey" FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
Access method: heap

